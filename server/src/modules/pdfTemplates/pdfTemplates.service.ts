import type { QuotationType } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";

export interface PdfTemplateInput {
  name?: string;
  quotationType?: QuotationType | null;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headerHtml?: string;
  footerHtml?: string;
  termsAndConditions?: string;
  htmlTemplate?: string | null;
}

export function listPdfTemplates(includeInactive = false) {
  return prisma.pdfTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" },
    ],
  });
}

export function getPdfTemplate(id: number) {
  return prisma.pdfTemplate.findUniqueOrThrow({ where: { id } });
}

export function createPdfTemplate(createdById: number, input: PdfTemplateInput & { name: string }, logoPath?: string) {
  return prisma.pdfTemplate.create({ data: { ...input, logoPath, createdById } });
}

export async function updatePdfTemplate(id: number, input: PdfTemplateInput, logoPath?: string) {
  return prisma.pdfTemplate.update({ where: { id }, data: { ...input, ...(logoPath ? { logoPath } : {}) } });
}

export async function deactivatePdfTemplate(id: number) {
  const template = await prisma.pdfTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new HttpError(404, "PDF template not found");
  }
  if (template.isDefault) {
    throw new HttpError(400, "Cannot delete the default PDF template");
  }

  const usedCount = await prisma.quotation.count({ where: { pdfTemplateId: id } });
  if (usedCount > 0) {
    throw new HttpError(400, "Cannot delete this PDF template because it is used by one or more quotations");
  }

  await prisma.pdfTemplate.delete({ where: { id } });
}

export async function setDefaultPdfTemplate(id: number) {
  const template = await prisma.pdfTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.pdfTemplate.updateMany({
    where: { quotationType: template.quotationType, isDefault: true },
    data: { isDefault: false },
  });
  return prisma.pdfTemplate.update({ where: { id }, data: { isDefault: true } });
}
