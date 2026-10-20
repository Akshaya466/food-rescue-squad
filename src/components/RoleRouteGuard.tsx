import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth } from "@/config/firebase";
import { User } from "@/types";
import { resolveActiveUserProfile } from "@/services/userService";
import { getDashboardRoute } from "@/services/roleRouting";

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
          if (!profile) {
            if (active) setState({ status: "redirect", path: "/login" });
            return;
          }

          const needsAdminClaim =
            role === "admin" ||
            (role === "dashboard" && profile.role === "admin");
          const hasAdminClaim = needsAdminClaim
            ? (await getIdTokenResult(firebaseUser)).claims.admin === true
            : false;

          if (role === "dashboard") {
            if (profile.role === "admin" && !hasAdminClaim) {
              if (active) setState({ status: "redirect", path: "/login" });
              return;
            }
            if (active) {
              setState({
                status: "redirect",
                path: getDashboardRoute(profile.role),
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
            (profile.role !== "admin" || !hasAdminClaim)
          ) {
            if (active) setState({ status: "redirect", path: "/login" });
            return;
          }

          if (profile.role !== role) {
            if (active) {
              setState({
                status: "redirect",
                path:
                  profile.role === "admin" && !hasAdminClaim
                    ? "/login"
                    : getDashboardRoute(profile.role),
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
