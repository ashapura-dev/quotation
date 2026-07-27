import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/errorHandler.js";

const BCRYPT_COST = 12;
const TOKEN_TTL = "12h";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Invalid email or password");

  const token = jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion }, env.jwtSecret, {
    expiresIn: TOKEN_TTL,
  });

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new HttpError(400, "Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    // Bumping tokenVersion invalidates every previously issued JWT for this user.
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
}
