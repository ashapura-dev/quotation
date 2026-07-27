import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AUTH_COOKIE_NAME, authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { changePassword, login } from "./auth.service.js";
import { env } from "../../config/env.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  maxAge: 12 * 60 * 60 * 1000,
};

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { token, user } = await login(email, password);
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    res.json({ user });
  }),
);

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.id, currentPassword, newPassword);
    res.clearCookie(AUTH_COOKIE_NAME);
    res.json({ success: true });
  }),
);

export default router;
