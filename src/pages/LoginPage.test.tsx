import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";

const authMocks = vi.hoisted(() => ({
  loginUser: vi.fn(),
  signInWithGoogle: vi.fn(),
  createProfileForAuthenticatedUser: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  resolveActiveUserProfile: vi.fn(),
  completeUserRoleSelection: vi.fn(),
  getUserProfile: vi.fn(),
}));
const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  onAuthStateChanged: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/services/authService", () => authMocks);
vi.mock("@/services/userService", () => profileMocks);
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
}));
vi.mock("@/config/firebase", () => ({ auth: firebaseMocks.auth }));
vi.mock("sonner", () => ({ toast: toastMocks }));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function renderLogin() {
  firebaseMocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return vi.fn();
  });
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <CurrentPath />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function submitEmailLogin() {
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
}

afterEach(() => {
  vi.clearAllMocks();
  firebaseMocks.auth.currentUser = null;
});

describe("LoginPage role routing", () => {
  it("routes a persisted donor role without changing it", async () => {
    firebaseMocks.auth.currentUser = { uid: "donor" };
    authMocks.loginUser.mockResolvedValue({
      id: "donor",
      name: "Donor",
      role: "donor",
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "donor",
      name: "Donor",
      role: "donor",
    });

    renderLogin();
    submitEmailLogin();

    await waitFor(() => expect(authMocks.loginUser).toHaveBeenCalledOnce());
    expect(await screen.findByText("/donor/dashboard")).toBeInTheDocument();
    expect(profileMocks.completeUserRoleSelection).not.toHaveBeenCalled();
  });

  it("does not promote a donor with a collector request during sign-in", async () => {
    firebaseMocks.auth.currentUser = { uid: "legacy-collector" };
    authMocks.loginUser.mockResolvedValue({
      id: "legacy-collector",
      name: "Collector Applicant",
      role: "donor",
      requestedRole: "collector",
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "legacy-collector",
      name: "Collector Applicant",
      role: "donor",
      requestedRole: "collector",
    });

    renderLogin();
    submitEmailLogin();

    await waitFor(() => expect(authMocks.loginUser).toHaveBeenCalledOnce());
    expect(await screen.findByText("/donor/dashboard")).toBeInTheDocument();
    expect(profileMocks.completeUserRoleSelection).not.toHaveBeenCalled();
  });

  it("routes an existing Google volunteer according to its persisted role", async () => {
    authMocks.signInWithGoogle.mockResolvedValue({
      firebaseUser: { uid: "volunteer" },
      profile: { id: "volunteer", name: "Volunteer", role: "volunteer" },
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "volunteer",
      name: "Volunteer",
      role: "volunteer",
    });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(await screen.findByText("/volunteer/dashboard")).toBeInTheDocument();
    expect(profileMocks.completeUserRoleSelection).not.toHaveBeenCalled();
  });

  it("creates a new Google profile using the role explicitly selected", async () => {
    authMocks.signInWithGoogle.mockResolvedValue({
      firebaseUser: { uid: "google-new" },
      profile: null,
    });
    authMocks.createProfileForAuthenticatedUser.mockResolvedValue({
      id: "google-new",
      name: "Google User",
      role: "collector",
    });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Collector/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("/collector/dashboard")).toBeInTheDocument();
    expect(authMocks.createProfileForAuthenticatedUser).toHaveBeenCalledWith(
      { uid: "google-new" },
      "collector"
    );
  });

  it("offers role completion for a signed-in account whose profile role is missing", async () => {
    firebaseMocks.auth.currentUser = { uid: "roleless-user" };
    authMocks.loginUser.mockResolvedValue({
      id: "roleless-user",
      name: "Legacy User",
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "roleless-user",
      name: "Legacy User",
    });
    profileMocks.completeUserRoleSelection.mockResolvedValue({
      id: "roleless-user",
      name: "Legacy User",
      role: "volunteer",
    });

    renderLogin();
    submitEmailLogin();
    fireEvent.click(
      await screen.findByRole("button", { name: /Delivery Volunteer/ })
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("/volunteer/dashboard")).toBeInTheDocument();
    expect(profileMocks.completeUserRoleSelection).toHaveBeenCalledWith(
      "roleless-user",
      "volunteer"
    );
  });
});
