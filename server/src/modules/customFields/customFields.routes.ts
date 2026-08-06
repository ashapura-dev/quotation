import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from "./customFields.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Only SUPER_ADMIN can view inactive custom fields
    const includeInactive = req.user?.role === "SUPER_ADMIN" && req.query.includeInactive === "true";
    res.json({ customFields: await listCustomFields(!includeInactive) });
  })
);

const createSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT"]),
  required: z.boolean().optional(),
  options: z.string().nullable().optional(),
  showInPdf: z.boolean().optional(),
});

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ customField: await createCustomField(createSchema.parse(req.body)) });
  })
);

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT"]).optional(),
  required: z.boolean().optional(),
  options: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  showInPdf: z.boolean().optional(),
});

router.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({
      customField: await updateCustomField(Number(req.params.id), updateSchema.parse(req.body)),
    });
  })
);

router.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ customField: await deleteCustomField(Number(req.params.id)) });
  })
);

export default router;
