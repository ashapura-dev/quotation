import { prisma } from "../config/db.js";

/**
 * Generates the next sequential number for a given prefix/period, e.g. ASH/2026/00001 or INV/2026/00001.
 * Uses a dedicated sequence table (rather than counting existing rows) so numbers stay sequential
 * even after soft deletes, and increments transactionally to avoid collisions under concurrent creates.
 */
export async function nextSequentialNumber(prefix: string, periodKey = String(new Date().getFullYear())): Promise<string> {
  const sequence = await prisma.$transaction(async (tx) => {
    const existing = await tx.quotationNumberSequence.findUnique({
      where: { prefix_periodKey: { prefix, periodKey } },
    });
    if (existing) {
      return tx.quotationNumberSequence.update({
        where: { id: existing.id },
        data: { lastSequence: { increment: 1 } },
      });
    }
    return tx.quotationNumberSequence.create({ data: { prefix, periodKey, lastSequence: 1 } });
  });

  return `${prefix}/${periodKey}/${String(sequence.lastSequence).padStart(5, "0")}`;
}
