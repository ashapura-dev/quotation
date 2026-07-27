import { apiClient } from "./client";

export interface Client {
  id: number;
  name: string;
  address: string | null;
  gstin: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

export interface ClientInput {
  name: string;
  address?: string;
  gstin?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export async function fetchClients(search?: string): Promise<Client[]> {
  const { data } = await apiClient.get<{ clients: Client[] }>("/api/clients", { params: { search } });
  return data.clients;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await apiClient.post<{ client: Client }>("/api/clients", input);
  return data.client;
}

export async function updateClient(id: number, input: ClientInput): Promise<Client> {
  const { data } = await apiClient.put<{ client: Client }>(`/api/clients/${id}`, input);
  return data.client;
}
