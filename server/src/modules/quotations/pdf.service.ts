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

  const allFields = await prisma.customField.findMany();
  const customFieldsData = allFields
    .map((f) => {
      const val = (quotation.customFields as any)?.[f.name];
      let valueStr = "-";
      if (val !== undefined && val !== null) {
        if (f.type === "BOOLEAN") {
          valueStr = val ? "Yes" : "No";
        } else {
          valueStr = String(val);
        }
      }
      return {
        label: f.label,
        value: valueStr,
        hasValue: val !== undefined && val !== null && val !== "",
      };
    })
    .filter((f) => f.hasValue);

  const pdfBuffer = await renderQuotationPdf(
    {
      quotationNumber: quotation.quotationNumber,
      quotationType: quotation.quotationType,
      showType: quotation.quotationType !== "NON_DPD",
      heading: (quotation.title || (quotation.quotationType === "NON_DPD" ? "IMPORT CLEARANCE FOR NON-DPD CARGO" : "IMPORT CLEARANCE FOR DPD CARGO") + (quotation.location ? ` - ${quotation.location.toUpperCase()}` : "")).toUpperCase(),
      route: quotation.route,
      location: quotation.location,
      title: quotation.title,
      customFields: customFieldsData,
      servicesOffered: quotation.servicesOffered,
      commodityType: quotation.commodityType,
      containerDetails: quotation.containerDetails,
      additionalRemarks: quotation.additionalRemarks,
      preparedBy: quotation.createdBy?.name,
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
        const breakdown = (typeof li.containerBreakdown === "string"
          ? JSON.parse(li.containerBreakdown)
          : li.containerBreakdown) as any[] | null;

        let rate20 = "-";
        let rate40 = "-";

        if (li.componentType === "PER_CONTAINER" && breakdown && Array.isArray(breakdown)) {
          const entry20 = breakdown.find((b: any) => b.label.includes("20"));
          const entry40 = breakdown.find((b: any) => b.label.includes("40"));
          if (entry20 && entry20.rate !== undefined && entry20.rate !== null) {
            rate20 = `Rs. ${Number(entry20.rate).toFixed(2)}`;
          }
          if (entry40 && entry40.rate !== undefined && entry40.rate !== null) {
            rate40 = `Rs. ${Number(entry40.rate).toFixed(2)}`;
          }
        } else if (li.componentType === "FIXED") {
          const val = `Rs. ${Number(li.fixedValue ?? 0).toFixed(2)}`;
          rate20 = val;
          rate40 = val;
        } else if (li.componentType === "PERCENTAGE") {
          const val = `${Number(li.percentageValue ?? 0).toFixed(2)}%`;
          rate20 = val;
          rate40 = val;
        } else if (li.componentType === "TEXT") {
          const val = li.textValue || "-";
          rate20 = val;
          rate40 = val;
        }

        return {
          label: li.label,
          isTax: li.isTax,
          rate20,
          rate40,
          remark: li.remark ?? "",
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
