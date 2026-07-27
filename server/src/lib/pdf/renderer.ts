import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import puppeteer, { type Browser } from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

Handlebars.registerHelper("money", (value: unknown) => (Number(value) || 0).toFixed(2));

const templateCache = new Map<string, HandlebarsTemplateDelegate>();
async function getTemplate(name: string) {
  const cached = templateCache.get(name);
  if (cached) return cached;
  const source = await fs.readFile(path.join(__dirname, "templates", name), "utf8");
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

let browserPromise: Promise<Browser> | null = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
  return browserPromise;
}

async function logoDataUri(logoPath: string | null | undefined): Promise<string | null> {
  if (!logoPath) return null;
  try {
    const filePath = path.resolve(process.cwd(), logoPath.replace(/^\/+/, ""));
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export interface PdfBranding {
  logoPath?: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  termsAndConditions?: string | null;
}

function brandingContext(branding: PdfBranding) {
  return {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    fontFamily: branding.fontFamily,
    headerHtml: branding.headerHtml ?? "",
    footerHtml: branding.footerHtml ?? "",
    termsAndConditions: branding.termsAndConditions ?? "",
  };
}

export interface QuotationPdfLineItem {
  label: string;
  isTax: boolean;
  computedAmount: number;
}

export interface QuotationPdfContainer {
  containerSizeLabel: string;
  quantity: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  quotationType: string;
  status: string;
  createdAt: string | Date;
  clientName: string;
  clientAddress?: string | null;
  clientContactPerson?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientGstin?: string | null;
  containers: QuotationPdfContainer[];
  lineItems: QuotationPdfLineItem[];
  subtotal: number;
  taxTotal: number;
  otherAdjustmentsTotal: number;
  grandTotal: number;
  notes?: string | null;
}

export async function renderQuotationPdf(quotation: QuotationPdfData, branding: PdfBranding): Promise<Buffer> {
  const template = await getTemplate("quotation.hbs");
  const html = template({
    ...quotation,
    createdAtFormatted: new Date(quotation.createdAt).toLocaleDateString(),
    logoDataUri: await logoDataUri(branding.logoPath),
    ...brandingContext(branding),
  });
  return renderHtmlToPdf(html);
}

export interface InvoicePdfLineItem {
  label: string;
  amount: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  quotationNumber?: string | null;
  paymentStatus: string;
  issuedAt: string | Date;
  dueDate?: string | Date | null;
  clientName: string;
  clientAddress?: string | null;
  clientContactPerson?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientGstin?: string | null;
  lineItems: InvoicePdfLineItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export async function renderInvoicePdf(invoice: InvoicePdfData, branding: PdfBranding): Promise<Buffer> {
  const template = await getTemplate("invoice.hbs");
  const html = template({
    ...invoice,
    issuedAtFormatted: new Date(invoice.issuedAt).toLocaleDateString(),
    dueDateFormatted: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : null,
    paymentStatusClass: invoice.paymentStatus.toLowerCase(),
    logoDataUri: await logoDataUri(branding.logoPath),
    ...brandingContext(branding),
  });
  return renderHtmlToPdf(html);
}
