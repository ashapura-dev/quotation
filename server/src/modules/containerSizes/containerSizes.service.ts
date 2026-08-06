import { prisma } from "../../config/db.js";

export function listContainerSizes(includeInactive = false) {
  return prisma.containerSize.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function createContainerSize(input: { code: string; label: string }) {
  return prisma.containerSize.create({
    data: { ...input, sortOrder: 0 },
  });
}

export function updateContainerSize(id: number, input: { code?: string; label?: string }) {
  return prisma.containerSize.update({ where: { id }, data: input });
}

export function deactivateContainerSize(id: number) {
  // Never hard-deleted: historical quotations/rate templates reference container sizes by id.
  return prisma.containerSize.update({ where: { id }, data: { isActive: false } });
}

