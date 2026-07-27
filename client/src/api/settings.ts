import { apiClient } from "./client";

export interface SmtpSettings {
  host: string | null;
  port: number | null;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
  isConfigured: boolean;
}

export interface SmtpSettingsInput {
  host: string;
  port: number;
  username: string;
  password?: string;
  fromAddress: string;
  fromName: string;
}

export async function fetchSmtpSettings(): Promise<SmtpSettings> {
  const { data } = await apiClient.get<{ smtp: SmtpSettings }>("/api/settings/smtp");
  return data.smtp;
}

export async function updateSmtpSettings(input: SmtpSettingsInput): Promise<SmtpSettings> {
  const { data } = await apiClient.put<{ smtp: SmtpSettings }>("/api/settings/smtp", input);
  return data.smtp;
}

export async function sendTestEmail(toAddress: string): Promise<void> {
  await apiClient.post("/api/settings/smtp/test", { toAddress });
}
