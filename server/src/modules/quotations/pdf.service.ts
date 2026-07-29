import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { renderQuotationPdf } from "../../lib/pdf/renderer.js";
import { getQuotation } from "./quotations.service.js";

async function resolvePdfTemplate(savedPdfTemplateId: number | null, quotationType: string, requestedTemplateId?: number) {
  if (requestedTemplateId) {
    const template = await prisma.pdfTemplate.findUnique({ where: { id: requestedTemplateId } });
    if (template) return template;
  }
  if (savedPdfTemplateId) {
    const template = await prisma.pdfTemplate.findUnique({ where: { id: savedPdfTemplateId } });
    if (template) return template;
  }
  const specific = await prisma.pdfTemplate.findFirst({
    where: { isDefault: true, isActive: true, quotationType: quotationType as never },
  });
  if (specific) return specific;

  const general = await prisma.pdfTemplate.findFirst({ where: { isDefault: true, isActive: true, quotationType: null } });
  if (general) return general;

  throw new HttpError(400, "No PDF template is configured. Ask an Admin to create one in PDF Templates.");
}

export async function generateQuotationPdf(quotationId: number, requestedTemplateId?: number) {
  const quotation = await getQuotation(quotationId);
  const template = await resolvePdfTemplate(quotation.pdfTemplateId, quotation.quotationType, requestedTemplateId);

  const pdfBuffer = await renderQuotationPdf(
    {
      quotationNumber: quotation.quotationNumber,
      quotationType: quotation.quotationType,
      status: quotation.status,
      createdAt: quotation.createdAt,
      clientName: quotation.clientName,
      clientAddress: quotation.clientAddress,
      clientContactPerson: quotation.clientContactPerson,
      clientPhone: quotation.clientPhone,
      clientEmail: quotation.clientEmail,
      clientGstin: quotation.clientGstin,
      containers: quotation.containers,
      lineItems: quotation.lineItems.map((li: any) => {
        let breakdownText = "";
        if (li.componentType === "PER_CONTAINER" && li.containerBreakdown) {
          const breakdown = (typeof li.containerBreakdown === "string"
            ? JSON.parse(li.containerBreakdown)
            : li.containerBreakdown) as any[];
          if (Array.isArray(breakdown)) {
            breakdownText = breakdown
              .map((b) => `${b.label}: Rs. ${Number(b.rate).toFixed(2)} × ${b.quantity}`)
              .join(", ");
          }
        }
        return {
          label: li.label,
          isTax: li.isTax,
          computedAmount: Number(li.computedAmount),
          breakdownText: breakdownText || undefined,
        };
      }),
      subtotal: quotation.subtotal,
      taxTotal: quotation.taxTotal,
      otherAdjustmentsTotal: quotation.otherAdjustmentsTotal,
      grandTotal: quotation.grandTotal,
      notes: quotation.notes,
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

  return { pdfBuffer, quotation };
}
