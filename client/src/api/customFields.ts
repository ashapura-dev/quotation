import { apiClient } from "./client";

export interface CustomField {
  id: number;
  name: string;
  label: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
  required: boolean;
  options: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchCustomFields(includeInactive = false): Promise<CustomField[]> {
  const { data } = await apiClient.get<{ customFields: CustomField[] }>("/api/custom-fields", {
    params: { includeInactive },
  });
  return data.customFields;
}

export async function createCustomField(input: {
  label: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
  required?: boolean;
  options?: string | null;
}): Promise<CustomField> {
  const { data } = await apiClient.post<{ customField: CustomField }>("/api/custom-fields", input);
  return data.customField;
}

export async function updateCustomField(
  id: number,
  input: {
    label?: string;
    type?: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
    required?: boolean;
    options?: string | null;
    isActive?: boolean;
  }
): Promise<CustomField> {
  const { data } = await apiClient.put<{ customField: CustomField }>(`/api/custom-fields/${id}`, input);
  return data.customField;
}

export async function deleteCustomField(id: number): Promise<void> {
  await apiClient.delete(`/api/custom-fields/${id}`);
}
