import { apiClient } from "./client";

export type Role = "ADMIN" | "STAFF" | "APPROVER";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const { data } = await apiClient.get<{ user: AuthUser }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<{ user: AuthUser }>("/api/auth/login", { email, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout");
}
