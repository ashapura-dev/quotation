import { apiClient } from "./client";

export interface AppNotification {
  id: number;
  type: "SUBMITTED_FOR_REVIEW" | "APPROVED" | "REJECTED" | "SENT";
  message: string;
  relatedQuotationId: number | null;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(unreadOnly = false): Promise<AppNotification[]> {
  const { data } = await apiClient.get<{ notifications: AppNotification[] }>("/api/notifications", {
    params: { unreadOnly },
  });
  return data.notifications;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiClient.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post("/api/notifications/read-all");
}
