import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { requireXhrHeader } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import containerSizeRoutes from "./modules/containerSizes/containerSizes.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import rateTemplateRoutes from "./modules/rateTemplates/rateTemplates.routes.js";
import pdfTemplateRoutes from "./modules/pdfTemplates/pdfTemplates.routes.js";
import quotationRoutes from "./modules/quotations/quotations.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use(requireXhrHeader);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/container-sizes", containerSizeRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/rate-templates", rateTemplateRoutes);
  app.use("/api/pdf-templates", pdfTemplateRoutes);
  app.use("/api/quotations", quotationRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);


  app.use("/api", notFoundHandler);

  // In production, Express serves the built React SPA itself (single process, no separate web server).
  if (env.nodeEnv === "production") {
    const clientDist = path.resolve(process.cwd(), "../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);

  return app;
}
