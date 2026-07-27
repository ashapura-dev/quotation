import nodemailer from "nodemailer";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { decryptSecret, encryptSecret } from "../../utils/crypto.js";

export async function getSmtpSettings() {
  const settings = await prisma.smtpSetting.findUnique({ where: { id: 1 } });
  if (!settings) return { host: null, port: null, username: null, fromAddress: null, fromName: null, isConfigured: false };
  const { passwordEnc, ...rest } = settings;
  return rest;
}

export async function updateSmtpSettings(input: {
  host: string;
  port: number;
  username: string;
  password?: string;
  fromAddress: string;
  fromName: string;
}) {
  const existing = await prisma.smtpSetting.findUnique({ where: { id: 1 } });
  const passwordEnc = input.password ? encryptSecret(input.password) : existing?.passwordEnc;

  await prisma.smtpSetting.upsert({
    where: { id: 1 },
    update: {
      host: input.host,
      port: input.port,
      username: input.username,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      passwordEnc,
      isConfigured: true,
    },
    create: {
      id: 1,
      host: input.host,
      port: input.port,
      username: input.username,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      passwordEnc,
      isConfigured: true,
    },
  });

  return getSmtpSettings();
}

async function getTransporter() {
  const settings = await prisma.smtpSetting.findUnique({ where: { id: 1 } });
  if (!settings || !settings.isConfigured || !settings.host || !settings.passwordEnc) {
    throw new HttpError(400, "SMTP is not configured yet. Set it up in Admin Settings first.");
  }
  const password = decryptSecret(settings.passwordEnc);
  return {
    transporter: nodemailer.createTransport({
      host: settings.host,
      port: settings.port ?? 587,
      secure: settings.port === 465,
      auth: { user: settings.username ?? undefined, pass: password },
    }),
    fromAddress: settings.fromAddress ?? settings.username ?? "no-reply@example.com",
    fromName: settings.fromName ?? "Ashapura Quotations",
  };
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const { transporter, fromAddress, fromName } = await getTransporter();
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}

export async function sendTestEmail(toAddress: string) {
  await sendMail({
    to: toAddress,
    subject: "Ashapura Quotations — SMTP test",
    html: "<p>This is a test email confirming your SMTP settings are working correctly.</p>",
  });
}
