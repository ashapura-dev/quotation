import { prisma } from "../../config/db.js";

export function listClients(search?: string) {
  return prisma.client.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: "asc" },
    take: 50,
  });
}

export function createClient(
  createdById: number,
  input: { name: string; address?: string; gstin?: string; contactPerson?: string; phone?: string; email?: string },
) {
  return prisma.client.create({ data: { ...input, createdById } });
}

export function updateClient(
  id: number,
  input: { name?: string; address?: string; gstin?: string; contactPerson?: string; phone?: string; email?: string },
) {
  return prisma.client.update({ where: { id }, data: input });
}
