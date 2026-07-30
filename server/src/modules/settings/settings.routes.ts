import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getSmtpSettings, sendTestEmail, updateSmtpSettings } from "./smtp.service.js";

const router = Router();
router.use(authenticate, requireRole("SUPER_ADMIN"));

router.get(
  "/smtp",
  asyncHandler(async (_req, res) => {
    res.json({ smtp: await getSmtpSettings() });
  }),
);

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  password: z.string().optional(),
  fromAddress: z.string().email(),
  fromName: z.string().min(1),
});

router.put(
  "/smtp",
  asyncHandler(async (req, res) => {
    res.json({ smtp: await updateSmtpSettings(smtpSchema.parse(req.body)) });
  }),
);

const testSchema = z.object({ toAddress: z.string().email() });

router.post(
  "/smtp/test",
  asyncHandler(async (req, res) => {
    const { toAddress } = testSchema.parse(req.body);
    await sendTestEmail(toAddress);
    res.json({ success: true });
  }),
);

export default router;
