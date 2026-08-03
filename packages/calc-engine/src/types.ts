export type ComponentType = "FIXED" | "PERCENTAGE" | "PER_CONTAINER" | "TEXT";

export interface ContainerRateInput {
  containerSizeId: string;
  rateValue: number;
}

export interface ComponentInput {
  /** Stable identifier for this component (template component id, or a temp id for ad-hoc Non-DPD rows). */
  id: string;
  label: string;
  componentType: ComponentType;
  /** Whether this component contributes to taxTotal (true) or otherAdjustmentsTotal (false). Only meaningful for PERCENTAGE. */
  isTax: boolean;
  sortOrder: number;
  /** Required when componentType === "FIXED". */
  fixedValue?: number;
  /** Required when componentType === "PERCENTAGE". Evaluated against the subtotal. Negative values represent discounts. */
  percentageValue?: number;
  /** Required when componentType === "PER_CONTAINER". One rate per container size this component applies to. */
  containerRates?: ContainerRateInput[];
  /** Required when componentType === "TEXT". */
  textValue?: string;
}

export interface SelectedContainerInput {
  containerSizeId: string;
  label: string;
  quantity: number;
}

export interface ContainerBreakdownEntry {
  containerSizeId: string;
  label: string;
  quantity: number;
  rate: number;
  lineTotal: number;
}

export interface ComputedLineItem {
  id: string;
  label: string;
  componentType: ComponentType;
  isTax: boolean;
  sortOrder: number;
  computedAmount: number;
  containerBreakdown?: ContainerBreakdownEntry[];
  textValue?: string;
}

export interface QuotationTotals {
  lineItems: ComputedLineItem[];
  subtotal: number;
  taxTotal: number;
  otherAdjustmentsTotal: number;
  grandTotal: number;
}
