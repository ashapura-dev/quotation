import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createNewVersion,
  createRateTemplate,
  deactivateRateTemplate,
  listRateTemplates,
  replaceComponents,
  updateRateTemplate,
} from "./rateTemplates.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const quotationType = req.query.quotationType as "DPD" | "NON_DPD" | undefined;
    res.json({ rateTemplates: await listRateTemplates(quotationType, req.query.includeInactive === "true") });
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  quotationType: z.enum(["DPD", "NON_DPD"]),
  location: z.string().optional().nullable(),
});

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    res.status(201).json({ rateTemplate: await createRateTemplate({ ...input, createdById: req.user!.id }) });
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  location: z.string().optional().nullable(),
});

router.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ rateTemplate: await updateRateTemplate(Number(req.params.id), updateSchema.parse(req.body)) });
  }),
);

router.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    await deactivateRateTemplate(Number(req.params.id));
    res.json({ success: true });
  }),
);

router.post(
  "/:id/new-version",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ rateTemplate: await createNewVersion(Number(req.params.id), req.user!.id) });
  }),
);

const syncComponentSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1),
  componentType: z.enum(["FIXED", "PERCENTAGE", "PER_CONTAINER", "TEXT"]),
  isTax: z.boolean(),
  fixedValue: z.number().nullable().optional(),
  percentageValue: z.number().nullable().optional(),
  containerRates: z.array(z.object({ containerSizeId: z.number(), rateValue: z.number() })).optional(),
  textValue: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});

router.put(
  "/:id/components",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const components = z.array(syncComponentSchema).parse(req.body.components);
    res.json({ rateTemplate: await replaceComponents(Number(req.params.id), components) });
  }),
);

export default router;
