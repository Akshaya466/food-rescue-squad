import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth } from "@/config/firebase";
import { User } from "@/types";
import { resolveActiveUserProfile } from "@/services/userService";
import { getDashboardRoute, getEffectiveRole } from "@/services/roleRouting";

type RouteRole = User["role"] | "dashboard" | "authenticated";
type GuardState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "redirect"; path: string };

interface RoleRouteGuardProps {
  role: RouteRole;
  children: ReactNode;
}

export function RoleRouteGuard({ role, children }: RoleRouteGuardProps) {
  const [state, setState] = useState<GuardState>({ status: "checking" });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        if (active) setState({ status: "redirect", path: "/login" });
        return;
      }

      void (async () => {
        try {
          const profile = await resolveActiveUserProfile(firebaseUser.uid);
          const activeRole = getEffectiveRole(profile);
          if (!profile || !activeRole) {
            if (active) setState({ status: "redirect", path: "/login" });
            return;
          }

          const needsAdminClaim =
            role === "admin" ||
            (role === "dashboard" && activeRole === "admin");
          const hasAdminClaim = needsAdminClaim
            ? (await getIdTokenResult(firebaseUser)).claims.admin === true
            : false;

          if (role === "dashboard") {
            if (activeRole === "admin" && !hasAdminClaim) {
              if (active) setState({ status: "redirect", path: "/login" });
              return;
            }
            if (active) {
              setState({
                status: "redirect",
                path: getDashboardRoute(activeRole),
              });
            }
            return;
          }

          if (role === "authenticated") {
            if (active) setState({ status: "allowed" });
            return;
          }

          if (
            role === "admin" &&
            (activeRole !== "admin" || !hasAdminClaim)
          ) {
            if (active) setState({ status: "redirect", path: "/login" });
            return;
          }

          if (activeRole !== role) {
            if (active) {
              setState({
                status: "redirect",
                path:
                  activeRole === "admin" && !hasAdminClaim
                    ? "/login"
                    : getDashboardRoute(activeRole),
              });
            }
            return;
          }

          if (active) setState({ status: "allowed" });
        } catch (error: unknown) {
          console.error("Failed to authorize dashboard route:", error);
          if (active) setState({ status: "redirect", path: "/login" });
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [role]);

  if (state.status === "checking") return null;
  if (state.status === "redirect") {
    return <Navigate to={state.path} replace />;
  }
  return <>{children}</>;
}
