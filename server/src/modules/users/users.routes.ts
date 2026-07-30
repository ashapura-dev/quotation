import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createUser, listUsers, setUserActive, updateUser } from "./users.service.js";

const router = Router();
router.use(authenticate, requireRole("SUPER_ADMIN"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ users: await listUsers() });
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "EMPLOYEE", "TL"]),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    res.status(201).json({ user: await createUser(input) });
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "EMPLOYEE", "TL"]).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    res.json({ user: await updateUser(Number(req.params.id), input) });
  }),
);

const statusSchema = z.object({ isActive: z.boolean() });

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { isActive } = statusSchema.parse(req.body);
    res.json({ user: await setUserActive(Number(req.params.id), isActive) });
  }),
);

export default router;
