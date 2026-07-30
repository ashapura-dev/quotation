import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createContainerSize,
  deactivateContainerSize,
  listContainerSizes,
  reorderContainerSizes,
  updateContainerSize,
} from "./containerSizes.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ containerSizes: await listContainerSizes(req.query.includeInactive === "true") });
  }),
);

const createSchema = z.object({ code: z.string().min(1), label: z.string().min(1) });

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ containerSize: await createContainerSize(createSchema.parse(req.body)) });
  }),
);

const updateSchema = z.object({ code: z.string().min(1).optional(), label: z.string().min(1).optional() });

router.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ containerSize: await updateContainerSize(Number(req.params.id), updateSchema.parse(req.body)) });
  }),
);

router.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ containerSize: await deactivateContainerSize(Number(req.params.id)) });
  }),
);

const reorderSchema = z.object({ orderedIds: z.array(z.number()) });

router.patch(
  "/reorder",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ containerSizes: await reorderContainerSizes(reorderSchema.parse(req.body).orderedIds) });
  }),
);

export default router;
