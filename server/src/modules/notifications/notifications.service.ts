import type { NotificationType, Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/db.js";

export async function listNotifications(userId: number, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: number, userId: number) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: number) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

/** Creates one notification row per user with any of the given roles. Safe to call inside a transaction via `tx`. */
export async function notifyRoles(
  tx: Prisma.TransactionClient,
  roles: Role[],
  type: NotificationType,
  message: string,
  relatedQuotationId?: number,
) {
  const users = await tx.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  if (users.length === 0) return;
  await tx.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, message, relatedQuotationId })),
  });
}

export async function notifyUser(
  tx: Prisma.TransactionClient,
  userId: number,
  type: NotificationType,
  message: string,
  relatedQuotationId?: number,
) {
  await tx.notification.create({ data: { userId, type, message, relatedQuotationId } });
}
