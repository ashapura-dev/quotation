import { apiClient } from "./client";

export interface DashboardSummary {
  statusCounts: Record<"DRAFT" | "PENDING" | "APPROVED" | "SENT_TO_CLIENT" | "APPROVED_BY_CLIENT" | "REJECTED_BY_CLIENT", number>;
  typeCounts: Record<"DPD" | "NON_DPD", number>;
  conversionRate: number;
  volumeOverTime: { month: string; count: number }[];
  topClients: { clientName: string; count: number; total: number }[];
  avgApprovalTurnaroundDays: number | null;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/api/dashboard/summary");
  return data;
}
