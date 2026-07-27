import type { QuotationType } from "@prisma/client";
import { prisma } from "../../config/db.js";

export interface PdfTemplateInput {
  name?: string;
  quotationType?: QuotationType | null;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headerHtml?: string;
  footerHtml?: string;
  termsAndConditions?: string;
}

export function listPdfTemplates(includeInactive = false) {
  return prisma.pdfTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
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
  await prisma.pdfTemplate.update({ where: { id }, data: { isActive: false, isDefault: false } });
}

export async function setDefaultPdfTemplate(id: number) {
  const template = await prisma.pdfTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.pdfTemplate.updateMany({
    where: { quotationType: template.quotationType, isDefault: true },
    data: { isDefault: false },
  });
  return prisma.pdfTemplate.update({ where: { id }, data: { isDefault: true } });
}
