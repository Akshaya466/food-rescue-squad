import { User } from "@/types";

export function getEffectiveRole(
  user?: Pick<User, "role" | "requestedRole"> | null
): User["role"] {
  if (!user) return "donor";

  if (user.role !== "donor") {
    return user.role;
  }

  if (user.requestedRole === "collector") {
    return "collector";
  }

  return "donor";
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
