import type { Role } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { hashPassword } from "../auth/auth.service.js";

export function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "A user with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: input.role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return user;
}

export async function updateUser(id: number, input: { name?: string; role?: Role; password?: string }) {
  const data: any = {
    name: input.name,
    role: input.role,
  };

  if (input.password) {
    data.passwordHash = await hashPassword(input.password);
    data.tokenVersion = { increment: 1 };
  }

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function setUserActive(id: number, isActive: boolean) {
  return prisma.user.update({
    where: { id },
    // Deactivating bumps tokenVersion so any outstanding session for this user is invalidated immediately.
    data: isActive ? { isActive } : { isActive, tokenVersion: { increment: 1 } },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}
