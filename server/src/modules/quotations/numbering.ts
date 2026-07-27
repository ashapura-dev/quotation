import { prisma } from "../../config/db.js";
import { nextSequentialNumber } from "../../utils/numbering.js";

const DEFAULT_PREFIX = "ASH";

export async function nextQuotationNumber(): Promise<string> {
  const prefixSetting = await prisma.appSetting.findUnique({ where: { key: "numbering.prefix" } });
  return nextSequentialNumber(prefixSetting?.value ?? DEFAULT_PREFIX);
}
