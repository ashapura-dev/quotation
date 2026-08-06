import type {
  ComponentInput,
  ComputedLineItem,
  ContainerBreakdownEntry,
  QuotationTotals,
  SelectedContainerInput,
} from "./types.js";

export * from "./types.js";

/** Avoids floating-point drift on money math (e.g. 0.1 + 0.2). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeFixedAmount(component: ComponentInput): number {
  return round2(component.fixedValue ?? 0);
}

function computePerContainerAmount(
  component: ComponentInput,
  selectedContainers: SelectedContainerInput[],
): { amount: number; breakdown: ContainerBreakdownEntry[] } {
  const rateBySize = new Map((component.containerRates ?? []).map((r) => [r.containerSizeId, r.rateValue]));
  const breakdown: ContainerBreakdownEntry[] = [];

  for (const container of selectedContainers) {
    const rate = rateBySize.get(container.containerSizeId);
    if (rate === undefined) continue;
    breakdown.push({
      containerSizeId: container.containerSizeId,
      label: container.label,
      quantity: container.quantity,
      rate,
      lineTotal: round2(rate * container.quantity),
      textValue: (component.containerRates ?? []).find((entry) => entry.containerSizeId === container.containerSizeId)?.textValue,
    });
  }

  const amount = round2(breakdown.reduce((sum, entry) => sum + entry.lineTotal, 0));
  return { amount, breakdown };
}

/**
 * Computes quotation totals from a dynamic set of rate components and the selected containers.
 *
 * Percentage components are evaluated against the subtotal only (never compounded on each other
 * or on prior percentage lines) — this matches standard GST behavior, where e.g. CGST 9% and
 * SGST 9% are both computed on the same base rather than stacking on top of one another.
 */
export function computeQuotationTotals(
  components: ComponentInput[],
  selectedContainers: SelectedContainerInput[],
): QuotationTotals {
  const sorted = [...components].sort((a, b) => a.sortOrder - b.sortOrder);

  const fixedAndContainerItems: ComputedLineItem[] = [];
  let subtotal = 0;

  for (const component of sorted) {
    if (component.componentType === "FIXED") {
      const amount = computeFixedAmount(component);
      subtotal += amount;
      fixedAndContainerItems.push({
        id: component.id,
        label: component.label,
        componentType: component.componentType,
        isTax: component.isTax,
        sortOrder: component.sortOrder,
        computedAmount: amount,
      });
    } else if (component.componentType === "PER_CONTAINER") {
      const { amount, breakdown } = computePerContainerAmount(component, selectedContainers);
      subtotal += amount;
      fixedAndContainerItems.push({
        id: component.id,
        label: component.label,
        componentType: component.componentType,
        isTax: component.isTax,
        sortOrder: component.sortOrder,
        computedAmount: amount,
        containerBreakdown: breakdown,
      });
    } else if (component.componentType === "PER_CONTAINER_TEXT") {
      const breakdown = selectedContainers.flatMap((container) => {
        const textValue = (component.containerRates ?? []).find((rate) => rate.containerSizeId === container.containerSizeId)?.textValue;
        return textValue === undefined ? [] : [{
          containerSizeId: container.containerSizeId,
          label: container.label,
          quantity: container.quantity,
          rate: 0,
          lineTotal: 0,
          textValue,
        }];
      });
      fixedAndContainerItems.push({
        id: component.id,
        label: component.label,
        componentType: component.componentType,
        isTax: component.isTax,
        sortOrder: component.sortOrder,
        computedAmount: 0,
        containerBreakdown: breakdown,
      });
    } else if (component.componentType === "TEXT") {
      fixedAndContainerItems.push({
        id: component.id,
        label: component.label,
        componentType: component.componentType,
        isTax: component.isTax,
        sortOrder: component.sortOrder,
        computedAmount: 0,
        textValue: component.textValue,
      });
    }
  }
  subtotal = round2(subtotal);

  const percentageItems: ComputedLineItem[] = [];
  let taxTotal = 0;
  let otherAdjustmentsTotal = 0;

  for (const component of sorted) {
    if (component.componentType !== "PERCENTAGE") continue;
    const amount = round2((subtotal * (component.percentageValue ?? 0)) / 100);
    if (component.isTax) {
      taxTotal += amount;
    } else {
      otherAdjustmentsTotal += amount;
    }
    percentageItems.push({
      id: component.id,
      label: component.label,
      componentType: component.componentType,
      isTax: component.isTax,
      sortOrder: component.sortOrder,
      computedAmount: amount,
    });
  }
  taxTotal = round2(taxTotal);
  otherAdjustmentsTotal = round2(otherAdjustmentsTotal);

  const lineItems = [...fixedAndContainerItems, ...percentageItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const grandTotal = round2(subtotal + taxTotal + otherAdjustmentsTotal);

  return { lineItems, subtotal, taxTotal, otherAdjustmentsTotal, grandTotal };
}
