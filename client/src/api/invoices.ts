import { apiClient } from "./client";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface InvoiceLineItem {
  id: number;
  label: string;
  amount: number;
  sortOrder: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  quotationId: number;
  quotation: { id: number; quotationNumber: string } | null;
  clientName: string;
  clientAddress: string | null;
  clientGstin: string | null;
  clientContactPerson: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  issuedAt: string;
  dueDate: string | null;
  createdBy: { id: number; name: string };
  createdAt: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceListResult {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchInvoices(filters: { search?: string; paymentStatus?: string; page?: number; pageSize?: number } = {}): Promise<InvoiceListResult> {
  const { data } = await apiClient.get<InvoiceListResult>("/api/invoices", { params: filters });
  return data;
}

export async function fetchInvoice(id: number): Promise<Invoice> {
  const { data } = await apiClient.get<{ invoice: Invoice }>(`/api/invoices/${id}`);
  return data.invoice;
}

export async function updateInvoicePaymentStatus(id: number, paymentStatus: PaymentStatus): Promise<Invoice> {
  const { data } = await apiClient.patch<{ invoice: Invoice }>(`/api/invoices/${id}/payment-status`, { paymentStatus });
  return data.invoice;
}

export async function convertQuotationToInvoice(quotationId: number): Promise<Invoice> {
  const { data } = await apiClient.post<{ invoice: Invoice }>(`/api/quotations/${quotationId}/convert-to-invoice`);
  return data.invoice;
}

export function invoicePdfUrl(id: number, apiBase: string): string {
  return `${apiBase}/api/invoices/${id}/pdf`;
}
