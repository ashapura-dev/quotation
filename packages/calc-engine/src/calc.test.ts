import { describe, expect, it } from "vitest";
import { computeQuotationTotals } from "./index.js";
import type { ComponentInput, SelectedContainerInput } from "./types.js";

const containers: SelectedContainerInput[] = [
  { containerSizeId: "20ft", label: "20ft", quantity: 2 },
  { containerSizeId: "40ft", label: "40ft", quantity: 1 },
];

describe("computeQuotationTotals", () => {
  it("sums fixed components into the subtotal", () => {
    const components: ComponentInput[] = [
      { id: "1", label: "Customs Clearance", componentType: "FIXED", isTax: false, sortOrder: 0, fixedValue: 5000 },
      { id: "2", label: "Statutory Charges", componentType: "FIXED", isTax: false, sortOrder: 1, fixedValue: 1500 },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.subtotal).toBe(6500);
    expect(result.grandTotal).toBe(6500);
  });

  it("expands per-container components across selected containers and quantities", () => {
    const components: ComponentInput[] = [
      {
        id: "1",
        label: "Transportation",
        componentType: "PER_CONTAINER",
        isTax: false,
        sortOrder: 0,
        containerRates: [
          { containerSizeId: "20ft", rateValue: 8000 },
          { containerSizeId: "40ft", rateValue: 12000 },
        ],
      },
    ];
    const result = computeQuotationTotals(components, containers);
    // 20ft: 8000 * 2 = 16000, 40ft: 12000 * 1 = 12000
    expect(result.subtotal).toBe(28000);
    expect(result.lineItems[0].containerBreakdown).toHaveLength(2);
  });

  it("skips containers with no configured rate for a per-container component", () => {
    const components: ComponentInput[] = [
      {
        id: "1",
        label: "Reefer Surcharge",
        componentType: "PER_CONTAINER",
        isTax: false,
        sortOrder: 0,
        containerRates: [{ containerSizeId: "20ft", rateValue: 500 }],
      },
    ];
    const result = computeQuotationTotals(components, containers);
    expect(result.subtotal).toBe(1000); // only the 20ft x2 leg applies
    expect(result.lineItems[0].containerBreakdown).toHaveLength(1);
  });

  it("evaluates percentage components against the subtotal, not compounded on each other", () => {
    const components: ComponentInput[] = [
      { id: "1", label: "Base Charge", componentType: "FIXED", isTax: false, sortOrder: 0, fixedValue: 10000 },
      { id: "2", label: "CGST", componentType: "PERCENTAGE", isTax: true, sortOrder: 1, percentageValue: 9 },
      { id: "3", label: "SGST", componentType: "PERCENTAGE", isTax: true, sortOrder: 2, percentageValue: 9 },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.subtotal).toBe(10000);
    expect(result.taxTotal).toBe(1800); // 900 + 900, both on the same 10000 base
    expect(result.grandTotal).toBe(11800);
  });

  it("treats a negative percentage as a discount that reduces the grand total via otherAdjustmentsTotal", () => {
    const components: ComponentInput[] = [
      { id: "1", label: "Base Charge", componentType: "FIXED", isTax: false, sortOrder: 0, fixedValue: 10000 },
      { id: "2", label: "Loyalty Discount", componentType: "PERCENTAGE", isTax: false, sortOrder: 1, percentageValue: -10 },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.otherAdjustmentsTotal).toBe(-1000);
    expect(result.grandTotal).toBe(9000);
  });

  it("returns a zero subtotal and grand total when there are no components or containers", () => {
    const result = computeQuotationTotals([], []);
    expect(result.subtotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.otherAdjustmentsTotal).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.lineItems).toHaveLength(0);
  });

  it("returns zero for a per-container component when no containers are selected", () => {
    const components: ComponentInput[] = [
      {
        id: "1",
        label: "Transportation",
        componentType: "PER_CONTAINER",
        isTax: false,
        sortOrder: 0,
        containerRates: [{ containerSizeId: "20ft", rateValue: 8000 }],
      },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.subtotal).toBe(0);
    expect(result.lineItems[0].containerBreakdown).toHaveLength(0);
  });

  it("avoids floating-point drift on typical GST-style decimal percentages", () => {
    const components: ComponentInput[] = [
      { id: "1", label: "Base Charge", componentType: "FIXED", isTax: false, sortOrder: 0, fixedValue: 999.99 },
      { id: "2", label: "CGST", componentType: "PERCENTAGE", isTax: true, sortOrder: 1, percentageValue: 9 },
      { id: "3", label: "SGST", componentType: "PERCENTAGE", isTax: true, sortOrder: 2, percentageValue: 9 },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.subtotal).toBe(999.99);
    expect(Number.isInteger(result.taxTotal * 100)).toBe(true);
    expect(Number.isInteger(result.grandTotal * 100)).toBe(true);
  });

  it("keeps line items ordered by sortOrder across mixed component types", () => {
    const components: ComponentInput[] = [
      { id: "tax", label: "CGST", componentType: "PERCENTAGE", isTax: true, sortOrder: 2, percentageValue: 9 },
      { id: "fixed", label: "Customs Clearance", componentType: "FIXED", isTax: false, sortOrder: 0, fixedValue: 5000 },
      {
        id: "container",
        label: "Transportation",
        componentType: "PER_CONTAINER",
        isTax: false,
        sortOrder: 1,
        containerRates: [{ containerSizeId: "20ft", rateValue: 8000 }],
      },
    ];
    const result = computeQuotationTotals(components, containers);
    expect(result.lineItems.map((li) => li.id)).toEqual(["fixed", "container", "tax"]);
  });

  it("processes TEXT components, preserving sortOrder, setting computedAmount to 0 and keeping textValue", () => {
    const components: ComponentInput[] = [
      { id: "1", label: "Some text description", componentType: "TEXT", isTax: false, sortOrder: 0, textValue: "Special terms apply" },
      { id: "2", label: "Base Charge", componentType: "FIXED", isTax: false, sortOrder: 1, fixedValue: 1000 },
    ];
    const result = computeQuotationTotals(components, []);
    expect(result.subtotal).toBe(1000);
    expect(result.grandTotal).toBe(1000);
    expect(result.lineItems[0].id).toBe("1");
    expect(result.lineItems[0].computedAmount).toBe(0);
    expect(result.lineItems[0].textValue).toBe("Special terms apply");
  });
});
