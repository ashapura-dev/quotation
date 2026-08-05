import { apiClient } from "./client";
import type { RateComponent } from "./rateTemplates";

export type QuotationStatus = "DRAFT" | "PENDING" | "APPROVED" | "SENT_TO_CLIENT" | "APPROVED_BY_CLIENT" | "REJECTED_BY_CLIENT";
export type QuotationType = "DPD" | "NON_DPD";

export interface QuotationContainer {
  containerSizeId: number;
  containerSizeLabel: string;
  quantity: number;
}

export interface QuotationLineItem extends RateComponent {
  computedAmount: number;
  containerBreakdown?: { containerSizeId: number; label: string; quantity: number; rate: number; lineTotal: number }[];
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  quotationType: QuotationType;
  status: QuotationStatus;
  clientId: number | null;
  clientName: string;
  clientAddress: string | null;
  clientGstin: string | null;
  clientContactPerson: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  rateTemplateId: number | null;
  rateTemplate?: { id: number; name: string } | null;
  pdfTemplateId: number | null;
  pdfTemplate?: { id: number; name: string } | null;
  location: string | null;
  route: string | null;
  title: string | null;
  customFields: Record<string, any> | null;
  servicesOffered: string | null;
  commodityType: string | null;
  containerDetails: string | null;
  additionalRemarks: string | null;
  notes: string | null;
  subtotal: number;
  taxTotal: number;
  otherAdjustmentsTotal: number;
  grandTotal: number;
  createdById: number;
  createdBy: { id: number; name: string };
  approvedBy: { id: number; name: string } | null;
  submittedAt: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  containers: QuotationContainer[];
  lineItems: QuotationLineItem[];
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
  location?: string;
  route?: string;
  title?: string;
  customFields?: Record<string, any>;
  servicesOffered?: string;
  commodityType?: string;
  containerDetails?: string;
  additionalRemarks?: string;
  notes?: string;
  containers: QuotationContainer[];
  components: RateComponent[];
}

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus | "";
  quotationType?: QuotationType | "";
  containerSizeId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface QuotationListResult {
  quotations: Quotation[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchQuotations(filters: QuotationFilters = {}): Promise<QuotationListResult> {
  const { data } = await apiClient.get<QuotationListResult>("/api/quotations", { params: filters });
  return data;
}

export async function deleteQuotation(id: number): Promise<void> {
  await apiClient.delete(`/api/quotations/${id}`);
}

export function quotationPdfUrl(id: number, apiBase: string, templateId?: number | null): string {
  const params = templateId ? `?templateId=${templateId}` : "";
  return `${apiBase}/api/quotations/${id}/pdf${params}`;
}

export async function emailQuotation(id: number, input: { templateId?: number | null; toAddress?: string }): Promise<{ sentTo: string }> {
  const { data } = await apiClient.post<{ success: boolean; sentTo: string }>(`/api/quotations/${id}/email`, input);
  return data;
}

export function exportQuotationsUrl(filters: QuotationFilters, apiBase: string): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return `${apiBase}/api/quotations/export?${params.toString()}`;
}

export async function fetchQuotation(id: number): Promise<Quotation> {
  const { data } = await apiClient.get<{ quotation: Quotation }>(`/api/quotations/${id}`);
  return data.quotation;
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>("/api/quotations", input);
  return data.quotation;
}

export async function updateQuotation(id: number, input: QuotationInput): Promise<Quotation> {
  const { data } = await apiClient.put<{ quotation: Quotation }>(`/api/quotations/${id}`, input);
  return data.quotation;
}

export async function duplicateQuotation(id: number): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/duplicate`);
  return data.quotation;
}

export async function submitQuotation(id: number): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/submit`);
  return data.quotation;
}

export async function approveQuotation(id: number): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/approve`);
  return data.quotation;
}

export async function rejectQuotation(id: number, comment: string): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/reject`, { comment });
  return data.quotation;
}

export async function markQuotationSent(id: number): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/mark-sent`);
  return data.quotation;
}

export async function clientApproveQuotation(id: number): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/client-approve`);
  return data.quotation;
}

export async function clientRejectQuotation(id: number, comment: string): Promise<Quotation> {
  const { data } = await apiClient.post<{ quotation: Quotation }>(`/api/quotations/${id}/client-reject`, { comment });
  return data.quotation;
}

export interface StatusHistoryEntry {
  id: number;
  fromStatus: QuotationStatus;
  toStatus: QuotationStatus;
  comment: string | null;
  createdAt: string;
  changedBy: { id: number; name: string };
}

export async function fetchStatusHistory(id: number): Promise<StatusHistoryEntry[]> {
  const { data } = await apiClient.get<{ history: StatusHistoryEntry[] }>(`/api/quotations/${id}/status-history`);
  return data.history;
}
