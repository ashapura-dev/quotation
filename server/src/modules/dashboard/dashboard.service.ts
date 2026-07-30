import { prisma } from "../../config/db.js";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getDashboardSummary() {
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [statusGroups, typeGroups, recent, turnaroundRows] = await Promise.all([
    prisma.quotation.groupBy({ by: ["status"], where: { isDeleted: false }, _count: { _all: true } }),
    prisma.quotation.groupBy({ by: ["quotationType"], where: { isDeleted: false }, _count: { _all: true } }),
    prisma.quotation.findMany({
      where: { isDeleted: false, createdAt: { gte: since } },
      select: { createdAt: true, clientName: true, grandTotal: true, status: true },
    }),
    prisma.quotation.findMany({
      where: { isDeleted: false, submittedAt: { not: null }, approvedAt: { not: null } },
      select: { submittedAt: true, approvedAt: true },
    }),
  ]);

  const statusCounts = {
    DRAFT: 0,
    PENDING: 0,
    APPROVED: 0,
    SENT_TO_CLIENT: 0,
    APPROVED_BY_CLIENT: 0,
    REJECTED_BY_CLIENT: 0,
  } as Record<string, number>;
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;

  const typeCounts = { DPD: 0, NON_DPD: 0 } as Record<string, number>;
  for (const g of typeGroups) typeCounts[g.quotationType] = g._count._all;

  const totalActive = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const conversionRate =
    totalActive > 0
      ? Math.round(((statusCounts.SENT_TO_CLIENT + statusCounts.APPROVED_BY_CLIENT) / totalActive) * 1000) / 10
      : 0;

  const volumeMap = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    volumeMap.set(monthKey(d), 0);
  }
  for (const row of recent) {
    const key = monthKey(new Date(row.createdAt));
    if (volumeMap.has(key)) volumeMap.set(key, (volumeMap.get(key) ?? 0) + 1);
  }
  const volumeOverTime = Array.from(volumeMap.entries()).map(([month, count]) => ({ month, count }));

  const clientTotals = new Map<string, { count: number; total: number }>();
  for (const row of recent) {
    const entry = clientTotals.get(row.clientName) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(row.grandTotal);
    clientTotals.set(row.clientName, entry);
  }
  const topClients = Array.from(clientTotals.entries())
    .map(([clientName, v]) => ({ clientName, count: v.count, total: Math.round(v.total * 100) / 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const turnaroundDays = turnaroundRows.map(
    (r) => (new Date(r.approvedAt!).getTime() - new Date(r.submittedAt!).getTime()) / (1000 * 60 * 60 * 24),
  );
  const avgApprovalTurnaroundDays =
    turnaroundDays.length > 0
      ? Math.round((turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length) * 10) / 10
      : null;

  return {
    statusCounts,
    typeCounts,
    conversionRate,
    volumeOverTime,
    topClients,
    avgApprovalTurnaroundDays,
  };
}
