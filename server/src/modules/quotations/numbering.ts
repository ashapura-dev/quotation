import { nextSequentialNumber } from "../../utils/numbering.js";

const DEFAULT_PREFIX = "ASH";

export async function nextQuotationNumber(): Promise<string> {
  return nextSequentialNumber(DEFAULT_PREFIX);
}
