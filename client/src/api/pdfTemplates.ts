import { apiClient } from "./client";

export interface PdfTemplate {
  id: number;
  name: string;
  quotationType: "DPD" | "NON_DPD" | null;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerHtml: string | null;
  footerHtml: string | null;
  termsAndConditions: string | null;
  htmlTemplate: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface PdfTemplateInput {
  name: string;
  quotationType?: "DPD" | "NON_DPD" | null;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headerHtml?: string;
  footerHtml?: string;
  termsAndConditions?: string;
  htmlTemplate?: string | null;
  logo?: File | null;
}

function toFormData(input: PdfTemplateInput): FormData {
  const formData = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (key === "logo") {
      if (value instanceof File) formData.append("logo", value);
      return;
    }
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  return formData;
}

export async function fetchPdfTemplates(includeInactive = false): Promise<PdfTemplate[]> {
  const { data } = await apiClient.get<{ pdfTemplates: PdfTemplate[] }>("/api/pdf-templates", {
    params: { includeInactive },
  });
  return data.pdfTemplates;
}

export async function createPdfTemplate(input: PdfTemplateInput): Promise<PdfTemplate> {
  const { data } = await apiClient.post<{ pdfTemplate: PdfTemplate }>("/api/pdf-templates", toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.pdfTemplate;
}

export async function updatePdfTemplate(id: number, input: PdfTemplateInput): Promise<PdfTemplate> {
  const { data } = await apiClient.put<{ pdfTemplate: PdfTemplate }>(`/api/pdf-templates/${id}`, toFormData(input), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.pdfTemplate;
}

export async function deactivatePdfTemplate(id: number): Promise<void> {
  await apiClient.delete(`/api/pdf-templates/${id}`);
}

export async function setDefaultPdfTemplate(id: number): Promise<PdfTemplate> {
  const { data } = await apiClient.post<{ pdfTemplate: PdfTemplate }>(`/api/pdf-templates/${id}/set-default`);
  return data.pdfTemplate;
}

export async function fetchDefaultTemplateHtml(): Promise<string> {
  const { data } = await apiClient.get<{ defaultHtml: string }>("/api/pdf-templates/default-html");
  return data.defaultHtml;
}
