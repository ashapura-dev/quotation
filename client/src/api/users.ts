import { apiClient } from "./client";
import type { Role } from "./auth";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<{ users: User[] }>("/api/users");
  return data.users;
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/api/users", input);
  return data.user;
}

export async function updateUser(id: number, input: { name?: string; role?: Role }): Promise<User> {
  const { data } = await apiClient.put<{ user: User }>(`/api/users/${id}`, input);
  return data.user;
}

export async function setUserActive(id: number, isActive: boolean): Promise<User> {
  const { data } = await apiClient.patch<{ user: User }>(`/api/users/${id}/status`, { isActive });
  return data.user;
}
