import { apiClient } from "./client";

export interface ContainerSize {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export async function fetchContainerSizes(includeInactive = false): Promise<ContainerSize[]> {
  const { data } = await apiClient.get<{ containerSizes: ContainerSize[] }>("/api/container-sizes", {
    params: { includeInactive },
  });
  return data.containerSizes;
}

export async function createContainerSize(input: { code: string; label: string }): Promise<ContainerSize> {
  const { data } = await apiClient.post<{ containerSize: ContainerSize }>("/api/container-sizes", input);
  return data.containerSize;
}

export async function updateContainerSize(id: number, input: { code?: string; label?: string }): Promise<ContainerSize> {
  const { data } = await apiClient.put<{ containerSize: ContainerSize }>(`/api/container-sizes/${id}`, input);
  return data.containerSize;
}

export async function deactivateContainerSize(id: number): Promise<void> {
  await apiClient.delete(`/api/container-sizes/${id}`);
}
