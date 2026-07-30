import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  addComponent,
  createNewVersion,
  createRateTemplate,
  deactivateRateTemplate,
  deleteComponent,
  getRateTemplateSerialized,
  listRateTemplates,
  removeContainerRate,
  reorderComponents,
  replaceComponents,
  setContainerRate,
  updateComponent,
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

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ rateTemplate: await getRateTemplateSerialized(Number(req.params.id)) });
  }),
);

const createSchema = z.object({ name: z.string().min(1), quotationType: z.enum(["DPD", "NON_DPD"]) });

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    res.status(201).json({ rateTemplate: await createRateTemplate({ ...input, createdById: req.user!.id }) });
  }),
);

const updateSchema = z.object({ name: z.string().min(1).optional(), isDefault: z.boolean().optional() });

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

const componentSchema = z.object({
  label: z.string().min(1),
  componentType: z.enum(["FIXED", "PERCENTAGE", "PER_CONTAINER"]),
  isTax: z.boolean().optional(),
  fixedValue: z.number().optional(),
  percentageValue: z.number().optional(),
});

router.post(
  "/:id/components",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ rateTemplate: await addComponent(Number(req.params.id), componentSchema.parse(req.body)) });
  }),
);

const componentUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  isTax: z.boolean().optional(),
  fixedValue: z.number().nullable().optional(),
  percentageValue: z.number().nullable().optional(),
});

router.put(
  "/:id/components/:componentId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({
      rateTemplate: await updateComponent(
        Number(req.params.id),
        Number(req.params.componentId),
        componentUpdateSchema.parse(req.body),
      ),
    });
  }),
);

router.delete(
  "/:id/components/:componentId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ rateTemplate: await deleteComponent(Number(req.params.id), Number(req.params.componentId)) });
  }),
);

const reorderSchema = z.object({ orderedIds: z.array(z.number()) });

router.patch(
  "/:id/components/reorder",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ rateTemplate: await reorderComponents(Number(req.params.id), reorderSchema.parse(req.body).orderedIds) });
  }),
);

const syncComponentSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1),
  componentType: z.enum(["FIXED", "PERCENTAGE", "PER_CONTAINER"]),
  isTax: z.boolean(),
  fixedValue: z.number().nullable().optional(),
  percentageValue: z.number().nullable().optional(),
  containerRates: z.array(z.object({ containerSizeId: z.number(), rateValue: z.number() })).optional(),
});

router.put(
  "/:id/components",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const components = z.array(syncComponentSchema).parse(req.body.components);
    res.json({ rateTemplate: await replaceComponents(Number(req.params.id), components) });
  }),
);

const containerRateSchema = z.object({ containerSizeId: z.number(), rateValue: z.number() });

router.put(
  "/:id/components/:componentId/container-rates",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const { containerSizeId, rateValue } = containerRateSchema.parse(req.body);
    res.json({
      rateTemplate: await setContainerRate(Number(req.params.id), Number(req.params.componentId), containerSizeId, rateValue),
    });
  }),
);

router.delete(
  "/:id/components/:componentId/container-rates/:containerSizeId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({
      rateTemplate: await removeContainerRate(
        Number(req.params.id),
        Number(req.params.componentId),
        Number(req.params.containerSizeId),
      ),
    });
  }),
);

export default router;
