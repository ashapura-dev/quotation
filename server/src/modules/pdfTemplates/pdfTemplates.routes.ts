import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { uploadLogo } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDefaultTemplateHtml } from "../../lib/pdf/renderer.js";
import {
  createPdfTemplate,
  deactivatePdfTemplate,
  listPdfTemplates,
  setDefaultPdfTemplate,
  updatePdfTemplate,
} from "./pdfTemplates.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ pdfTemplates: await listPdfTemplates(req.query.includeInactive === "true") });
  }),
);

router.get(
  "/default-html",
  asyncHandler(async (req, res) => {
    const defaultHtml = await getDefaultTemplateHtml();
    res.json({ defaultHtml });
  }),
);

const templateSchema = z.object({
  name: z.string().min(1),
  quotationType: z.enum(["DPD", "NON_DPD"]).nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  termsAndConditions: z.string().optional(),
  htmlTemplate: z.string().optional().nullable(),
});

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  uploadLogo.single("logo"),
  asyncHandler(async (req, res) => {
    const input = templateSchema.parse({ ...req.body, quotationType: req.body.quotationType || undefined });
    const logoPath = req.file ? `/uploads/${req.file.filename}` : undefined;
    res.status(201).json({ pdfTemplate: await createPdfTemplate(req.user!.id, input, logoPath) });
  }),
);

router.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  uploadLogo.single("logo"),
  asyncHandler(async (req, res) => {
    const input = templateSchema.partial().parse({ ...req.body, quotationType: req.body.quotationType || undefined });
    const logoPath = req.file ? `/uploads/${req.file.filename}` : undefined;
    res.json({ pdfTemplate: await updatePdfTemplate(Number(req.params.id), input, logoPath) });
  }),
);

router.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    await deactivatePdfTemplate(Number(req.params.id));
    res.json({ success: true });
  }),
);

router.post(
  "/:id/set-default",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ pdfTemplate: await setDefaultPdfTemplate(Number(req.params.id)) });
  }),
);

export default router;
