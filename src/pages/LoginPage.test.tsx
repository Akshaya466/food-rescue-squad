import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";

const authMocks = vi.hoisted(() => ({
  loginUser: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  resolveActiveUserProfile: vi.fn(),
  selectUserRole: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/services/authService", () => authMocks);
vi.mock("@/services/userService", () => profileMocks);
vi.mock("sonner", () => ({ toast: toastMocks }));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" />,
}));

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <CurrentPath />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage role routing", () => {
  it("activates and routes an existing collector applicant before reporting login success", async () => {
    authMocks.loginUser.mockResolvedValue({
      id: "legacy-collector",
      name: "Collector",
      role: "donor",
      requestedRole: "collector",
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "legacy-collector",
      name: "Collector",
      role: "collector",
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "collector@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText("/collector/dashboard")
    ).toBeInTheDocument();
    expect(profileMocks.resolveActiveUserProfile).toHaveBeenCalledWith(
      "legacy-collector"
    );
    expect(toastMocks.success).toHaveBeenCalledWith("Welcome back, Collector!");
  });

  it("continues to route genuine donors to the donor dashboard", async () => {
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
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "donor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("/donor/dashboard")).toBeInTheDocument();
  });

  it("persists Google-selected collector role before navigating", async () => {
    authMocks.signInWithGoogle.mockResolvedValue({
      id: "google-user",
      name: "Google User",
      role: "donor",
    });
    profileMocks.resolveActiveUserProfile.mockResolvedValue({
      id: "google-user",
      name: "Google User",
      role: "donor",
    });
    profileMocks.selectUserRole.mockResolvedValue({
      id: "google-user",
      name: "Google User",
      role: "collector",
    });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Collector — NGO \/ Community Kitchen/,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("/collector/dashboard")).toBeInTheDocument();
    expect(profileMocks.selectUserRole).toHaveBeenCalledWith(
      "google-user",
      "collector"
    );
  });
});
