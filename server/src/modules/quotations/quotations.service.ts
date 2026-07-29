import type { ComponentType, QuotationStatus, QuotationType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { computeQuotationTotals, type ComponentInput, type SelectedContainerInput } from "@ashapura/calc-engine";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { nextQuotationNumber } from "./numbering.js";

export interface QuotationContainerInput {
  containerSizeId: number;
  containerSizeLabel: string;
  quantity: number;
}

export interface QuotationComponentInput {
  label: string;
  componentType: ComponentType;
  isTax: boolean;
  fixedValue?: number | null;
  percentageValue?: number | null;
  containerRates?: { containerSizeId: number; rateValue: number }[];
  sourceTemplateComponentId?: number | null;
}

export interface QuotationInput {
  quotationType: QuotationType;
  clientId?: number | null;
  clientName: string;
  clientAddress?: string;
  clientGstin?: string;
  clientContactPerson?: string;
  clientPhone?: string;
  clientEmail?: string;
  rateTemplateId?: number | null;
  pdfTemplateId?: number | null;
  notes?: string;
  containers: QuotationContainerInput[];
  components: QuotationComponentInput[];
}

function toCalcInputs(input: QuotationInput, allSizes: any[]): { components: ComponentInput[]; containers: SelectedContainerInput[] } {
  const components: ComponentInput[] = input.components.map((c, i) => ({
    id: c.sourceTemplateComponentId ? `tpl-${c.sourceTemplateComponentId}` : `line-${i}`,
    label: c.label,
    componentType: c.componentType,
    isTax: c.isTax,
    sortOrder: i,
    fixedValue: c.fixedValue ?? undefined,
    percentageValue: c.percentageValue ?? undefined,
    containerRates: (c.containerRates ?? []).map((r) => ({
      containerSizeId: String(r.containerSizeId),
      rateValue: r.rateValue,
    })),
  }));
  const containers: SelectedContainerInput[] = allSizes.map((size) => {
    const selected = input.containers.find((c) => c.containerSizeId === size.id);
    return {
      containerSizeId: String(size.id),
      label: size.label,
      quantity: selected ? selected.quantity : 0,
    };
  });
  return { components, containers };
}

const quotationInclude = {
  containers: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rateTemplate: { select: { id: true, name: true } },
  pdfTemplate: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
};

function num(value: unknown): number {
  return Number(value);
}

function serializeQuotation(quotation: any) {
  return {
    ...quotation,
    subtotal: num(quotation.subtotal),
    taxTotal: num(quotation.taxTotal),
    otherAdjustmentsTotal: num(quotation.otherAdjustmentsTotal),
    grandTotal: num(quotation.grandTotal),
    lineItems: quotation.lineItems.map((li: any) => ({
      ...li,
      fixedValue: li.fixedValue === null ? null : num(li.fixedValue),
      percentageValue: li.percentageValue === null ? null : num(li.percentageValue),
      computedAmount: num(li.computedAmount),
    })),
  };
}

export async function createQuotation(createdById: number, input: QuotationInput) {
  if (input.containers.length === 0 && input.components.some((c) => c.componentType === "PER_CONTAINER")) {
    throw new HttpError(400, "Select at least one container for a per-container rate component to apply");
  }

  const allSizes = await prisma.containerSize.findMany({ where: { isActive: true } });
  const { components, containers } = toCalcInputs(input, allSizes);
  const totals = computeQuotationTotals(components, containers);
  const quotationNumber = await nextQuotationNumber();

  const created = await prisma.quotation.create({
    data: {
      quotationNumber,
      quotationType: input.quotationType,
      status: "DRAFT",
      clientId: input.clientId ?? null,
      clientName: input.clientName,
      clientAddress: input.clientAddress,
      clientGstin: input.clientGstin,
      clientContactPerson: input.clientContactPerson,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      rateTemplateId: input.rateTemplateId ?? null,
      pdfTemplateId: input.pdfTemplateId ?? null,
      notes: input.notes,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      otherAdjustmentsTotal: totals.otherAdjustmentsTotal,
      grandTotal: totals.grandTotal,
      createdById,
      containers: {
        create: input.containers.map((c) => ({
          containerSizeId: c.containerSizeId,
          containerSizeLabel: c.containerSizeLabel,
          quantity: c.quantity,
        })),
      },
      lineItems: {
        create: totals.lineItems.map((li, i) => ({
          label: li.label,
          componentType: li.componentType,
          isTax: li.isTax,
          fixedValue: input.components[i].fixedValue ?? null,
          percentageValue: input.components[i].percentageValue ?? null,
          computedAmount: li.computedAmount,
          containerBreakdown: (li.containerBreakdown as Prisma.InputJsonValue | undefined) ?? undefined,
          sourceTemplateComponentId: input.components[i].sourceTemplateComponentId ?? null,
          sortOrder: li.sortOrder,
        })),
      },
    },
    include: quotationInclude,
  });

  return serializeQuotation(created);
}

export async function getQuotation(id: number) {
  const quotation = await prisma.quotation.findFirst({ where: { id, isDeleted: false }, include: quotationInclude });
  if (!quotation) throw new HttpError(404, "Quotation not found");
  return serializeQuotation(quotation);
}

async function assertEditable(id: number, userId: number, role: string) {
  const quotation = await prisma.quotation.findFirstOrThrow({ where: { id, isDeleted: false } });
  if (role !== "ADMIN" && quotation.createdById !== userId) {
    throw new HttpError(403, "You can only edit your own quotations");
  }
  if (role !== "ADMIN" && quotation.status !== "DRAFT") {
    throw new HttpError(400, "Only Draft quotations can be edited");
  }
  return quotation;
}

export async function updateQuotation(id: number, userId: number, role: string, input: QuotationInput) {
  const existing = await assertEditable(id, userId, role);
  const allSizes = await prisma.containerSize.findMany({ where: { isActive: true } });
  const { components, containers } = toCalcInputs(input, allSizes);
  const totals = computeQuotationTotals(components, containers);

  const wasLocked = existing.status === "APPROVED" || existing.status === "SENT";

  await prisma.$transaction(async (tx) => {
    await tx.quotationContainer.deleteMany({ where: { quotationId: id } });
    await tx.quotationLineItem.deleteMany({ where: { quotationId: id } });

    await tx.quotation.update({
      where: { id },
      data: {
        quotationType: input.quotationType,
        clientId: input.clientId ?? null,
        clientName: input.clientName,
        clientAddress: input.clientAddress,
        clientGstin: input.clientGstin,
        clientContactPerson: input.clientContactPerson,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        rateTemplateId: input.rateTemplateId ?? null,
        pdfTemplateId: input.pdfTemplateId ?? null,
        notes: input.notes,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        otherAdjustmentsTotal: totals.otherAdjustmentsTotal,
        grandTotal: totals.grandTotal,
        // Editing an Approved/Sent quotation reverts it to Draft, forcing re-approval.
        ...(wasLocked
          ? { status: "DRAFT" as const, submittedAt: null, approvedById: null, approvedAt: null, sentAt: null }
          : {}),
        containers: {
          create: input.containers.map((c) => ({
            containerSizeId: c.containerSizeId,
            containerSizeLabel: c.containerSizeLabel,
            quantity: c.quantity,
          })),
        },
        lineItems: {
          create: totals.lineItems.map((li, i) => ({
            label: li.label,
            componentType: li.componentType,
            isTax: li.isTax,
            fixedValue: input.components[i].fixedValue ?? null,
            percentageValue: input.components[i].percentageValue ?? null,
            computedAmount: li.computedAmount,
            containerBreakdown: (li.containerBreakdown as Prisma.InputJsonValue | undefined) ?? undefined,
            sourceTemplateComponentId: input.components[i].sourceTemplateComponentId ?? null,
            sortOrder: li.sortOrder,
          })),
        },
      },
    });

    if (wasLocked) {
      await tx.quotationStatusHistory.create({
        data: {
          quotationId: id,
          fromStatus: existing.status,
          toStatus: "DRAFT",
          changedById: userId,
          comment: "Reverted to Draft due to post-approval edit",
        },
      });

      const full = await tx.quotation.findUniqueOrThrow({
        where: { id },
        include: { containers: true, lineItems: true },
      });
      await tx.quotationRevision.create({
        data: {
          quotationId: id,
          snapshot: JSON.parse(JSON.stringify(full)),
          statusAtSnapshot: "DRAFT",
          reason: "post-approval-edit",
          createdById: userId,
        },
      });
    }
  });

  return getQuotation(id);
}

export async function duplicateQuotation(sourceId: number, createdById: number) {
  const source = await prisma.quotation.findFirstOrThrow({
    where: { id: sourceId, isDeleted: false },
    include: { containers: true, lineItems: true },
  });

  const quotationNumber = await nextQuotationNumber();
  const created = await prisma.quotation.create({
    data: {
      quotationNumber,
      quotationType: source.quotationType,
      status: "DRAFT",
      clientId: source.clientId,
      clientName: source.clientName,
      clientAddress: source.clientAddress,
      clientGstin: source.clientGstin,
      clientContactPerson: source.clientContactPerson,
      clientPhone: source.clientPhone,
      clientEmail: source.clientEmail,
      rateTemplateId: source.rateTemplateId,
      pdfTemplateId: source.pdfTemplateId,
      notes: source.notes,
      subtotal: source.subtotal,
      taxTotal: source.taxTotal,
      otherAdjustmentsTotal: source.otherAdjustmentsTotal,
      grandTotal: source.grandTotal,
      createdById,
      containers: {
        create: source.containers.map((c) => ({
          containerSizeId: c.containerSizeId,
          containerSizeLabel: c.containerSizeLabel,
          quantity: c.quantity,
        })),
      },
      lineItems: {
        create: source.lineItems.map((li) => ({
          label: li.label,
          componentType: li.componentType,
          isTax: li.isTax,
          fixedValue: li.fixedValue,
          percentageValue: li.percentageValue,
          computedAmount: li.computedAmount,
          containerBreakdown: li.containerBreakdown ?? undefined,
          sourceTemplateComponentId: li.sourceTemplateComponentId,
          sortOrder: li.sortOrder,
        })),
      },
    },
    include: quotationInclude,
  });

  return serializeQuotation(created);
}

export interface QuotationFilters {
  search?: string;
  status?: string;
  quotationType?: string;
  containerSizeId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

function buildWhere(filters: QuotationFilters): Prisma.QuotationWhereInput {
  const where: Prisma.QuotationWhereInput = { isDeleted: false };
  if (filters.search) where.clientName = { contains: filters.search };
  if (filters.status) where.status = filters.status as QuotationStatus;
  if (filters.quotationType) where.quotationType = filters.quotationType as QuotationType;
  if (filters.containerSizeId) where.containers = { some: { containerSizeId: filters.containerSizeId } };
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {}),
    };
  }
  return where;
}

export async function listQuotations(filters: QuotationFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where = buildWhere(filters);

  const [total, quotations] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    quotations: quotations.map((q) => ({
      ...q,
      subtotal: num(q.subtotal),
      taxTotal: num(q.taxTotal),
      otherAdjustmentsTotal: num(q.otherAdjustmentsTotal),
      grandTotal: num(q.grandTotal),
    })),
  };
}

export async function listQuotationsForExport(filters: QuotationFilters) {
  const where = buildWhere(filters);
  const quotations = await prisma.quotation.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true } }, containers: true },
    orderBy: { createdAt: "desc" },
  });
  return quotations.map((q) => ({
    ...q,
    subtotal: num(q.subtotal),
    taxTotal: num(q.taxTotal),
    otherAdjustmentsTotal: num(q.otherAdjustmentsTotal),
    grandTotal: num(q.grandTotal),
  }));
}

export async function deleteQuotation(id: number, userId: number, role: string) {
  const quotation = await prisma.quotation.findFirst({ where: { id, isDeleted: false } });
  if (!quotation) throw new HttpError(404, "Quotation not found");

  if (role !== "ADMIN") {
    if (quotation.createdById !== userId) throw new HttpError(403, "You can only delete your own quotations");
    if (quotation.status !== "DRAFT") throw new HttpError(400, "Only Draft quotations can be deleted");
  }

  await prisma.quotation.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
}
