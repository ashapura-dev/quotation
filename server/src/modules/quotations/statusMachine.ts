import type { QuotationStatus, Role } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { notifyRoles, notifyUser } from "../notifications/notifications.service.js";

export type StatusAction = "submit" | "approve" | "reject" | "markSent" | "clientApprove" | "clientReject";

interface TransitionRule {
  from: QuotationStatus;
  to: QuotationStatus;
  allowedRoles: Role[];
  requiresOwnership: boolean;
  requiresComment: boolean;
}

const TRANSITIONS: Record<StatusAction, TransitionRule> = {
  submit: { from: "DRAFT", to: "PENDING", allowedRoles: ["EMPLOYEE", "TL", "SUPER_ADMIN"], requiresOwnership: true, requiresComment: false },
  approve: { from: "PENDING", to: "APPROVED", allowedRoles: ["TL", "SUPER_ADMIN"], requiresOwnership: false, requiresComment: false },
  reject: { from: "PENDING", to: "DRAFT", allowedRoles: ["TL", "SUPER_ADMIN"], requiresOwnership: false, requiresComment: true },
  markSent: { from: "APPROVED", to: "SENT_TO_CLIENT", allowedRoles: ["EMPLOYEE", "SUPER_ADMIN"], requiresOwnership: true, requiresComment: false },
  clientApprove: { from: "SENT_TO_CLIENT", to: "APPROVED_BY_CLIENT", allowedRoles: ["EMPLOYEE", "TL", "SUPER_ADMIN"], requiresOwnership: false, requiresComment: false },
  clientReject: { from: "SENT_TO_CLIENT", to: "REJECTED_BY_CLIENT", allowedRoles: ["EMPLOYEE", "TL", "SUPER_ADMIN"], requiresOwnership: false, requiresComment: true },
};

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
  if (rule.requiresOwnership && user.role !== "SUPER_ADMIN" && quotation.createdById !== user.id) {
    throw new HttpError(403, "You can only do this on your own quotations");
  }
  if (quotation.status !== rule.from) {
    throw new HttpError(400, `Cannot ${action} a quotation that is currently ${quotation.status}`);
  }

  const autoApprove = action === "submit" && (user.role === "TL" || user.role === "SUPER_ADMIN");
  const targetStatus = autoApprove ? "APPROVED" : rule.to;

  await prisma.$transaction(async (tx) => {
    const statusFields: Record<string, unknown> = { status: targetStatus };
    if (action === "submit") {
      statusFields.submittedAt = new Date();
      if (autoApprove) {
        statusFields.approvedById = user.id;
        statusFields.approvedAt = new Date();
      }
    }
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
        toStatus: targetStatus,
        changedById: user.id,
        comment: comment?.trim() || null,
      },
    });

    if (action === "submit") {
      if (autoApprove) {
        await notifyUser(
          tx,
          quotation.createdById,
          "APPROVED",
          `Quotation ${quotation.quotationNumber} was automatically approved.`,
          quotationId,
        );
      } else {
        await notifyRoles(
          tx,
          ["TL", "SUPER_ADMIN"],
          "SUBMITTED_FOR_REVIEW",
          `Quotation ${quotation.quotationNumber} was submitted for your review.`,
          quotationId,
        );
      }
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
        ["SUPER_ADMIN"],
        "SENT_TO_CLIENT",
        `Quotation ${quotation.quotationNumber} was marked as Sent to Client.`,
        quotationId,
      );
    } else if (action === "clientApprove") {
      await notifyUser(
        tx,
        quotation.createdById,
        "APPROVED_BY_CLIENT",
        `Quotation ${quotation.quotationNumber} was approved by client.`,
        quotationId,
      );
      await notifyRoles(
        tx,
        ["SUPER_ADMIN"],
        "APPROVED_BY_CLIENT",
        `Quotation ${quotation.quotationNumber} was approved by client.`,
        quotationId,
      );
    } else if (action === "clientReject") {
      await notifyUser(
        tx,
        quotation.createdById,
        "REJECTED_BY_CLIENT",
        `Quotation ${quotation.quotationNumber} was rejected by client: ${comment?.trim()}`,
        quotationId,
      );
      await notifyRoles(
        tx,
        ["SUPER_ADMIN"],
        "REJECTED_BY_CLIENT",
        `Quotation ${quotation.quotationNumber} was rejected by client: ${comment?.trim()}`,
        quotationId,
      );
    }
  });

  return quotation;
}
