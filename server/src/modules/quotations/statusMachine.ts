import type { Prisma, QuotationStatus, Role } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { notifyRoles, notifyUser } from "../notifications/notifications.service.js";

export type StatusAction = "submit" | "approve" | "reject" | "markSent";

interface TransitionRule {
  from: QuotationStatus;
  to: QuotationStatus;
  allowedRoles: Role[];
  requiresOwnership: boolean;
  requiresComment: boolean;
}

const TRANSITIONS: Record<StatusAction, TransitionRule> = {
  submit: { from: "DRAFT", to: "PENDING", allowedRoles: ["STAFF", "ADMIN"], requiresOwnership: true, requiresComment: false },
  approve: { from: "PENDING", to: "APPROVED", allowedRoles: ["APPROVER", "ADMIN"], requiresOwnership: false, requiresComment: false },
  reject: { from: "PENDING", to: "DRAFT", allowedRoles: ["APPROVER", "ADMIN"], requiresOwnership: false, requiresComment: true },
  markSent: { from: "APPROVED", to: "SENT", allowedRoles: ["STAFF", "ADMIN"], requiresOwnership: true, requiresComment: false },
};

async function snapshotQuotation(tx: Prisma.TransactionClient, quotationId: number) {
  const full = await tx.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { containers: true, lineItems: true },
  });
  return JSON.parse(JSON.stringify(full));
}

export async function applyStatusTransition(
  quotationId: number,
  action: StatusAction,
  user: { id: number; role: Role },
  comment?: string,
) {
  const rule = TRANSITIONS[action];
  if (rule.requiresComment && !comment?.trim()) {
    throw new HttpError(400, "A comment is required for this action");
  }

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, isDeleted: false } });
  if (!quotation) throw new HttpError(404, "Quotation not found");

  if (!rule.allowedRoles.includes(user.role)) {
    throw new HttpError(403, "You do not have permission to perform this action");
  }
  if (rule.requiresOwnership && user.role !== "ADMIN" && quotation.createdById !== user.id) {
    throw new HttpError(403, "You can only do this on your own quotations");
  }
  if (quotation.status !== rule.from) {
    throw new HttpError(400, `Cannot ${action} a quotation that is currently ${quotation.status}`);
  }

  await prisma.$transaction(async (tx) => {
    const statusFields: Record<string, unknown> = { status: rule.to };
    if (action === "submit") statusFields.submittedAt = new Date();
    if (action === "approve") {
      statusFields.approvedById = user.id;
      statusFields.approvedAt = new Date();
    }
    if (action === "reject") {
      statusFields.approvedById = null;
      statusFields.approvedAt = null;
      statusFields.submittedAt = null;
    }
    if (action === "markSent") statusFields.sentAt = new Date();

    await tx.quotation.update({ where: { id: quotationId }, data: statusFields });

    await tx.quotationStatusHistory.create({
      data: {
        quotationId,
        fromStatus: rule.from,
        toStatus: rule.to,
        changedById: user.id,
        comment: comment?.trim() || null,
      },
    });

    await tx.quotationRevision.create({
      data: {
        quotationId,
        snapshot: await snapshotQuotation(tx, quotationId),
        statusAtSnapshot: rule.to,
        reason: `status:${action}`,
        createdById: user.id,
      },
    });

    if (action === "submit") {
      await notifyRoles(
        tx,
        ["APPROVER", "ADMIN"],
        "SUBMITTED_FOR_REVIEW",
        `Quotation ${quotation.quotationNumber} was submitted for your review.`,
        quotationId,
      );
    } else if (action === "approve") {
      await notifyUser(
        tx,
        quotation.createdById,
        "APPROVED",
        `Quotation ${quotation.quotationNumber} was approved.`,
        quotationId,
      );
    } else if (action === "reject") {
      await notifyUser(
        tx,
        quotation.createdById,
        "REJECTED",
        `Quotation ${quotation.quotationNumber} was sent back to Draft: ${comment?.trim()}`,
        quotationId,
      );
    } else if (action === "markSent") {
      await notifyRoles(
        tx,
        ["ADMIN"],
        "SENT",
        `Quotation ${quotation.quotationNumber} was marked as Sent.`,
        quotationId,
      );
    }
  });

  return quotation;
}
