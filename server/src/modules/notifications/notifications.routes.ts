import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ notifications: await listNotifications(req.user!.id, req.query.unreadOnly === "true") });
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await markNotificationRead(Number(req.params.id), req.user!.id);
    res.json({ success: true });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await markAllNotificationsRead(req.user!.id);
    res.json({ success: true });
  }),
);

export default router;
