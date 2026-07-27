import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { nextSequentialNumber } from "../../utils/numbering.js";
import { renderInvoicePdf } from "../../lib/pdf/renderer.js";

function num(value: unknown): number {
  return Number(value);
}

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    subtotal: num(invoice.subtotal),
    taxTotal: num(invoice.taxTotal),
    grandTotal: num(invoice.grandTotal),
    lineItems: invoice.lineItems?.map((li: any) => ({ ...li, amount: num(li.amount) })),
  };
}

const invoiceInclude = {
  lineItems: { orderBy: { sortOrder: "asc" as const } },
  createdBy: { select: { id: true, name: true } },
  quotation: { select: { id: true, quotationNumber: true } },
};

export async function convertQuotationToInvoice(quotationId: number, createdById: number) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, isDeleted: false },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quotation) throw new HttpError(404, "Quotation not found");
  if (quotation.status !== "APPROVED" && quotation.status !== "SENT") {
    throw new HttpError(400, "Only Approved or Sent quotations can be converted to an invoice");
  }

  const existing = await prisma.invoice.findFirst({ where: { quotationId } });
  if (existing) throw new HttpError(400, `This quotation was already converted to invoice ${existing.invoiceNumber}`);

  const invoiceNumber = await nextSequentialNumber("INV");
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      quotationId,
      clientName: quotation.clientName,
      clientAddress: quotation.clientAddress,
      clientGstin: quotation.clientGstin,
      clientContactPerson: quotation.clientContactPerson,
      clientPhone: quotation.clientPhone,
      clientEmail: quotation.clientEmail,
      subtotal: quotation.subtotal,
      taxTotal: quotation.taxTotal,
      grandTotal: quotation.grandTotal,
      dueDate,
      createdById,
      lineItems: {
        create: quotation.lineItems.map((li) => ({
          label: li.label,
          amount: li.computedAmount,
          sortOrder: li.sortOrder,
        })),
      },
    },
    include: invoiceInclude,
  });

  return serializeInvoice(invoice);
}

export interface InvoiceFilters {
  search?: string;
  paymentStatus?: string;
  page?: number;
  pageSize?: number;
}

export async function listInvoices(filters: InvoiceFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where = {
    ...(filters.search ? { clientName: { contains: filters.search } } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus as PaymentStatus } : {}),
  };

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } }, quotation: { select: { id: true, quotationNumber: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, invoices: invoices.map(serializeInvoice) };
}

export async function getInvoice(id: number) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice) throw new HttpError(404, "Invoice not found");
  return serializeInvoice(invoice);
}

export async function updatePaymentStatus(id: number, paymentStatus: PaymentStatus) {
  await prisma.invoice.update({ where: { id }, data: { paymentStatus } });
  return getInvoice(id);
}

export async function generateInvoicePdf(id: number) {
  const invoice = await getInvoice(id);
  const template =
    (await prisma.pdfTemplate.findFirst({ where: { isDefault: true, isActive: true, quotationType: null } })) ??
    (await prisma.pdfTemplate.findFirst({ where: { isActive: true } }));
  if (!template) throw new HttpError(400, "No PDF template is configured. Ask an Admin to create one in PDF Templates.");

  const pdfBuffer = await renderInvoicePdf(
    {
      invoiceNumber: invoice.invoiceNumber,
      quotationNumber: invoice.quotation?.quotationNumber,
      paymentStatus: invoice.paymentStatus,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress,
      clientContactPerson: invoice.clientContactPerson,
      clientPhone: invoice.clientPhone,
      clientEmail: invoice.clientEmail,
      clientGstin: invoice.clientGstin,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      grandTotal: invoice.grandTotal,
    },
    {
      logoPath: template.logoPath,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      fontFamily: template.fontFamily,
      headerHtml: template.headerHtml,
      footerHtml: template.footerHtml,
      termsAndConditions: template.termsAndConditions,
    },
  );

  return { pdfBuffer, invoice };
}
