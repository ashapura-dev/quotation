import { Router } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createQuotation,
  deleteQuotation,
  duplicateQuotation,
  getQuotation,
  listQuotations,
  listQuotationsForExport,
  updateQuotation,
} from "./quotations.service.js";
import { applyStatusTransition } from "./statusMachine.js";
import { prisma } from "../../config/db.js";
import { generateQuotationPdf } from "./pdf.service.js";
import { sendMail } from "../settings/smtp.service.js";
import { HttpError } from "../../middleware/errorHandler.js";

const router = Router();
router.use(authenticate);

const componentSchema = z.object({
  label: z.string().min(1),
  componentType: z.enum(["FIXED", "PERCENTAGE", "PER_CONTAINER", "TEXT"]),
  isTax: z.boolean(),
  fixedValue: z.number().nullable().optional(),
  percentageValue: z.number().nullable().optional(),
  containerRates: z.array(z.object({ containerSizeId: z.number(), rateValue: z.number() })).optional(),
  sourceTemplateComponentId: z.number().nullable().optional(),
  textValue: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});

const containerSchema = z.object({
  containerSizeId: z.number(),
  containerSizeLabel: z.string().min(1),
  quantity: z.number().int().positive(),
});

const quotationSchema = z.object({
  quotationType: z.enum(["DPD", "NON_DPD"]),
  clientId: z.number().nullable().optional(),
  clientName: z.string().min(1),
  clientAddress: z.string().optional(),
  clientGstin: z.string().optional(),
  clientContactPerson: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  rateTemplateId: z.number().nullable().optional(),
  pdfTemplateId: z.number().nullable().optional(),
  location: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional().nullable(),
  servicesOffered: z.string().optional().nullable(),
  commodityType: z.string().optional().nullable(),
  containerDetails: z.string().optional().nullable(),
  additionalRemarks: z.string().optional().nullable(),
  notes: z.string().optional(),
  containers: z.array(containerSchema),
  components: z.array(componentSchema),
});

function filtersFromQuery(query: Record<string, unknown>) {
  const standardKeys = ["search", "status", "quotationType", "containerSizeId", "dateFrom", "dateTo", "page", "pageSize", "fields"];
  const customFieldFilters: Record<string, any> = {};

  Object.entries(query).forEach(([key, val]) => {
    if (!standardKeys.includes(key) && val !== undefined && val !== null && val !== "") {
      customFieldFilters[key] = val;
    }
  });

  return {
    search: typeof query.search === "string" && query.search ? query.search : undefined,
    status: typeof query.status === "string" && query.status ? query.status : undefined,
    quotationType: typeof query.quotationType === "string" && query.quotationType ? query.quotationType : undefined,
    containerSizeId: query.containerSizeId ? Number(query.containerSizeId) : undefined,
    dateFrom: typeof query.dateFrom === "string" && query.dateFrom ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === "string" && query.dateTo ? query.dateTo : undefined,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    fields: typeof query.fields === "string" ? query.fields : undefined,
    customFieldFilters,
  };
}

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const parsedFilters = filtersFromQuery(req.query);
    const quotations = await listQuotationsForExport(parsedFilters);

    // Fetch custom field labels to map them dynamically to header titles
    const customFields = await prisma.customField.findMany();
    const customFieldsMap = customFields.reduce((acc, f) => {
      acc[f.name] = f.label;
      return acc;
    }, {} as Record<string, string>);

    const AVAILABLE_COLUMNS: Record<string, { header: string; width: number; getValue: (q: any) => any }> = {
      quotationNumber: { header: "Quotation Number", width: 20, getValue: (q) => q.quotationNumber },
      clientName: { header: "Client", width: 28, getValue: (q) => q.clientName },
      quotationType: { header: "Type", width: 10, getValue: (q) => q.quotationType },
      status: { header: "Status", width: 12, getValue: (q) => q.status },
      containers: { header: "Containers", width: 24, getValue: (q) => q.containers.map((c: any) => `${c.containerSizeLabel} x${c.quantity}`).join(", ") },
      subtotal: { header: "Subtotal", width: 14, getValue: (q) => q.subtotal },
      taxTotal: { header: "Tax", width: 14, getValue: (q) => q.taxTotal },
      otherAdjustmentsTotal: { header: "Other Adjustments", width: 16, getValue: (q) => q.otherAdjustmentsTotal },
      grandTotal: { header: "Grand Total", width: 14, getValue: (q) => q.grandTotal },
      createdBy: { header: "Created By", width: 18, getValue: (q) => q.createdBy?.name },
      approvedBy: { header: "Approved By", width: 18, getValue: (q) => q.approvedBy?.name ?? "-" },
      createdAt: { header: "Created At", width: 20, getValue: (q) => q.createdAt.toISOString() },
    };

    let activeKeys = Object.keys(AVAILABLE_COLUMNS);
    if (typeof parsedFilters.fields === "string" && parsedFilters.fields.trim() !== "") {
      activeKeys = parsedFilters.fields.split(",").map(k => k.trim());
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Quotations");

    sheet.columns = activeKeys.map(key => {
      if (AVAILABLE_COLUMNS[key]) {
        return {
          header: AVAILABLE_COLUMNS[key].header,
          key,
          width: AVAILABLE_COLUMNS[key].width
        };
      }
      const label = customFieldsMap[key] || key;
      return {
        header: label,
        key,
        width: 20
      };
    });

    for (const q of quotations) {
      const rowData: Record<string, any> = {};
      activeKeys.forEach(key => {
        if (AVAILABLE_COLUMNS[key]) {
          rowData[key] = AVAILABLE_COLUMNS[key].getValue(q);
        } else {
          const customVal = (q.customFields as Record<string, any>)?.[key];
          rowData[key] = customVal !== undefined && customVal !== null ? String(customVal) : "-";
        }
      });
      sheet.addRow(rowData);
    }

    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="quotations-export-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listQuotations(filtersFromQuery(req.query)));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = quotationSchema.parse(req.body);
    res.status(201).json({ quotation: await createQuotation(req.user!.id, input) });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = quotationSchema.parse(req.body);
    res.json({
      quotation: await updateQuotation(Number(req.params.id), req.user!.id, req.user!.role, input),
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteQuotation(Number(req.params.id), req.user!.id, req.user!.role);
    res.json({ success: true });
  }),
);

router.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    res.status(201).json({ quotation: await duplicateQuotation(Number(req.params.id), req.user!.id) });
  }),
);

const commentSchema = z.object({ comment: z.string().optional() });

router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    await applyStatusTransition(Number(req.params.id), "submit", req.user!);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    await applyStatusTransition(Number(req.params.id), "approve", req.user!);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const { comment } = commentSchema.parse(req.body);
    await applyStatusTransition(Number(req.params.id), "reject", req.user!, comment);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/:id/mark-sent",
  asyncHandler(async (req, res) => {
    await applyStatusTransition(Number(req.params.id), "markSent", req.user!);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/:id/client-approve",
  asyncHandler(async (req, res) => {
    await applyStatusTransition(Number(req.params.id), "clientApprove", req.user!);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.post(
  "/:id/client-reject",
  asyncHandler(async (req, res) => {
    const { comment } = commentSchema.parse(req.body);
    await applyStatusTransition(Number(req.params.id), "clientReject", req.user!, comment);
    res.json({ quotation: await getQuotation(Number(req.params.id)) });
  }),
);

router.get(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    const revisions = await prisma.quotationRevision.findMany({
      where: { quotationId: Number(req.params.id) },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ revisions });
  }),
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const templateId = req.query.templateId ? Number(req.query.templateId) : undefined;
    const { pdfBuffer, quotation } = await generateQuotationPdf(Number(req.params.id), templateId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${quotation.quotationNumber.replace(/\//g, "-")}.pdf"`);
    res.send(pdfBuffer);
  }),
);

const emailSchema = z.object({ templateId: z.number().optional(), toAddress: z.string().email().optional() });

router.post(
  "/:id/email",
  asyncHandler(async (req, res) => {
    const { templateId, toAddress } = emailSchema.parse(req.body ?? {});
    const { pdfBuffer, quotation } = await generateQuotationPdf(Number(req.params.id), templateId);
    const recipient = toAddress || quotation.clientEmail;
    if (!recipient) throw new HttpError(400, "This quotation has no client email on file — provide one to send to.");

    await sendMail({
      to: recipient,
      subject: `Quotation ${quotation.quotationNumber} from Ashapura`,
      html: `<p>Dear ${quotation.clientContactPerson || quotation.clientName},</p><p>Please find attached quotation <strong>${quotation.quotationNumber}</strong>.</p><p>Regards,<br/>Ashapura</p>`,
      attachments: [{ filename: `${quotation.quotationNumber.replace(/\//g, "-")}.pdf`, content: pdfBuffer }],
    });

    res.json({ success: true, sentTo: recipient });
  }),
);

router.get(
  "/:id/status-history",
  asyncHandler(async (req, res) => {
    const history = await prisma.quotationStatusHistory.findMany({
      where: { quotationId: Number(req.params.id) },
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ history });
  }),
);

export default router;
