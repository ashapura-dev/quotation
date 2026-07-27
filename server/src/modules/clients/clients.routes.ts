import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createClient, listClients, updateClient } from "./clients.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ clients: await listClients(typeof req.query.search === "string" ? req.query.search : undefined) });
  }),
);

const clientSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  gstin: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    res.status(201).json({ client: await createClient(req.user!.id, clientSchema.parse(req.body)) });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ client: await updateClient(Number(req.params.id), clientSchema.partial().parse(req.body)) });
  }),
);

export default router;
