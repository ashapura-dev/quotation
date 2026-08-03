import type { ComponentType } from "../lib/calcEngine";
import { apiClient } from "./client";

export interface ContainerRate {
  id?: number;
  containerSizeId: number;
  rateValue: number;
}

export interface RateComponent {
  id?: number;
  label: string;
  componentType: ComponentType;
  isTax: boolean;
  sortOrder: number;
  fixedValue: number | null;
  percentageValue: number | null;
  containerRates: ContainerRate[];
  isActive?: boolean;
  sourceTemplateComponentId?: number | null;
  textValue?: string | null;
}

export interface RateTemplate {
  id: number;
  name: string;
  quotationType: "DPD" | "NON_DPD";
  version: number;
  isDefault: boolean;
  isActive: boolean;
  components: RateComponent[];
  location: string | null;
}

export async function fetchRateTemplates(quotationType?: "DPD" | "NON_DPD", includeInactive = false): Promise<RateTemplate[]> {
  const { data } = await apiClient.get<{ rateTemplates: RateTemplate[] }>("/api/rate-templates", {
    params: { quotationType, includeInactive },
  });
  return data.rateTemplates;
}

export async function fetchRateTemplate(id: number): Promise<RateTemplate> {
  const { data } = await apiClient.get<{ rateTemplate: RateTemplate }>(`/api/rate-templates/${id}`);
  return data.rateTemplate;
}

export async function createRateTemplate(input: { name: string; quotationType: "DPD" | "NON_DPD"; location?: string | null }): Promise<RateTemplate> {
  const { data } = await apiClient.post<{ rateTemplate: RateTemplate }>("/api/rate-templates", input);
  return data.rateTemplate;
}

export async function updateRateTemplateMeta(id: number, input: { name?: string; isDefault?: boolean; location?: string | null }): Promise<RateTemplate> {
  const { data } = await apiClient.put<{ rateTemplate: RateTemplate }>(`/api/rate-templates/${id}`, input);
  return data.rateTemplate;
}

export async function deactivateRateTemplate(id: number): Promise<void> {
  await apiClient.delete(`/api/rate-templates/${id}`);
}

export async function saveRateTemplateComponents(id: number, components: RateComponent[]): Promise<RateTemplate> {
  const { data } = await apiClient.put<{ rateTemplate: RateTemplate }>(`/api/rate-templates/${id}/components`, {
    components,
  });
  return data.rateTemplate;
}

export async function createNewRateTemplateVersion(id: number): Promise<RateTemplate> {
  const { data } = await apiClient.post<{ rateTemplate: RateTemplate }>(`/api/rate-templates/${id}/new-version`);
  return data.rateTemplate;
}
