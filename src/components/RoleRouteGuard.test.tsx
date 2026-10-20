import { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { RoleRouteGuard } from "./RoleRouteGuard";

const authMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  getIdTokenResult: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  resolveActiveUserProfile: vi.fn(),
}));

vi.mock("firebase/auth", () => authMocks);
vi.mock("@/config/firebase", () => ({ auth: {} }));
vi.mock("@/services/userService", () => profileMocks);

function LocationText() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function TestRoutes({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/collector/dashboard"]}>
      <LocationText />
      <Routes>
        <Route
          path="/collector/dashboard"
          element={
            <RoleRouteGuard role="collector">{children}</RoleRouteGuard>
          }
        />
        <Route
          path="/donor/dashboard"
          element={<span>Donor dashboard destination</span>}
        />
        <Route path="/admin/dashboard" element={<span>Admin destination</span>} />
        <Route path="/login" element={<span>Login destination</span>} />
      </Routes>
    </MemoryRouter>
  );
}

function setAuthState(user: { uid: string } | null) {
  authMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(user);
    return vi.fn();
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("RoleRouteGuard", () => {
  it("allows an authenticated collector to load the direct dashboard route", async () => {
    setAuthState({ uid: "collector-user" });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "collector-user",
      role: "collector",
    });

    render(<TestRoutes><p>Collector dashboard content</p></TestRoutes>);

    expect(await screen.findByText("Collector dashboard content")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent(
      "/collector/dashboard"
    );
  });

  it("loads the collector route for an existing donor/requested-collector profile only after role resolution", async () => {
    setAuthState({ uid: "legacy-collector" });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "legacy-collector",
      role: "collector",
    });

    render(<TestRoutes><p>Collector dashboard content</p></TestRoutes>);

    expect(await screen.findByText("Collector dashboard content")).toBeInTheDocument();
    expect(profileMocks.resolveActiveUserProfile).toHaveBeenCalledWith(
      "legacy-collector"
    );
  });

  it("routes unauthenticated direct dashboard navigation to login", async () => {
    setAuthState(null);

    render(<TestRoutes><p>Collector dashboard content</p></TestRoutes>);

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(screen.queryByText("Collector dashboard content")).not.toBeInTheDocument();
  });

  it("redirects a donor profile away from the collector dashboard", async () => {
    setAuthState({ uid: "donor-user" });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "donor-user",
      role: "donor",
    });

    render(<TestRoutes><p>Collector dashboard content</p></TestRoutes>);

    expect(await screen.findByText("Donor dashboard destination")).toBeInTheDocument();
    expect(screen.queryByText("Collector dashboard content")).not.toBeInTheDocument();
  });

  it("redirects profiles without a valid role to login for role completion", async () => {
    setAuthState({ uid: "roleless-user" });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "roleless-user",
      role: undefined,
    });

    render(<TestRoutes><p>Collector dashboard content</p></TestRoutes>);

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(screen.queryByText("Collector dashboard content")).not.toBeInTheDocument();
  });

  it("requires the trusted Firebase admin claim for an admin dashboard", async () => {
    setAuthState({ uid: "admin-profile-without-claim" });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "admin-profile-without-claim",
      role: "admin",
    });
    authMocks.getIdTokenResult.mockResolvedValue({ claims: { admin: false } });

    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <RoleRouteGuard role="admin">
                <p>Admin dashboard content</p>
              </RoleRouteGuard>
            }
          />
          <Route path="/login" element={<span>Login destination</span>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(screen.queryByText("Admin dashboard content")).not.toBeInTheDocument();
    expect(authMocks.getIdTokenResult).toHaveBeenCalledOnce();
  });
});
