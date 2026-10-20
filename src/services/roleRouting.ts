import { User } from "@/types";

export function getEffectiveRole(
  user?: Pick<User, "role" | "requestedRole"> | null
): User["role"] | null {
  if (!user) return null;
  return ["donor", "collector", "volunteer", "admin"].includes(user.role)
    ? user.role
    : null;
}

export function getDashboardRoute(role?: User["role"] | null): string {
  const routes: Record<User["role"], string> = {
    donor: "/donor/dashboard",
    collector: "/collector/dashboard",
    volunteer: "/volunteer/dashboard",
    admin: "/admin/dashboard",
  };

  return routes[role || "donor"] || routes.donor;
}
