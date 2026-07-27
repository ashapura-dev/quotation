import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { HttpError } from "./errorHandler.js";

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  userId: number;
  tokenVersion: number;
}

export const AUTH_COOKIE_NAME = "token";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) throw new HttpError(401, "Not authenticated");

    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || !user.isActive) throw new HttpError(401, "Not authenticated");
    if (user.tokenVersion !== payload.tokenVersion) throw new HttpError(401, "Session expired, please log in again");

    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "Not authenticated"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Not authenticated"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Insufficient permissions"));
    next();
  };
}

/** CSRF mitigation: mutating requests from the SPA must carry this header (cookies alone are not proof of same-origin intent). */
export function requireXhrHeader(req: Request, _res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
    return next(new HttpError(403, "Missing required request header"));
  }
  next();
}
