import type { ReactNode } from "react";
import type { Role } from "../api/auth";
import { useAuth } from "../hooks/useAuth";

/** UX-only convenience for hiding actions the user's role can't perform. The server enforces the real boundary. */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return null;
  return <>{children}</>;
}
