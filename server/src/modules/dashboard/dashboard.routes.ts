import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardSummary } from "./dashboard.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardSummary());
  }),
);

export default router;
