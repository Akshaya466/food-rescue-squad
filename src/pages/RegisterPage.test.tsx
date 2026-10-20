import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RegisterPage from "./RegisterPage";

const authMocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  signInWithGoogle: vi.fn(),
  createProfileForAuthenticatedUser: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  completeUserRoleSelection: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/services/authService", () => authMocks);
vi.mock("@/services/userService", () => profileMocks);
vi.mock("sonner", () => ({ toast: toastMocks }));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    onCheckedChange,
    ...props
  }: {
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      {...props}
      type="checkbox"
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <CurrentPath />
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("Your full name"), {
    target: { value: "Test User" },
  });
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByPlaceholderText("your phone number"), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByPlaceholderText("Chennai"), {
    target: { value: "Chennai" },
  });
  fireEvent.click(screen.getByLabelText(/I agree to the/));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("RegisterPage role selection", () => {
  it.each([
    ["Donor", "donor", "/donor/dashboard"],
    ["Collector", "collector", "/collector/dashboard"],
    ["Delivery Volunteer", "volunteer", "/volunteer/dashboard"],
  ])("registers and routes the selected %s role", async (label, role, route) => {
    authMocks.registerUser.mockResolvedValue({
      id: "new-user",
      name: "Test User",
      role,
    });
    renderRegister();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(authMocks.registerUser).toHaveBeenCalledOnce());
    expect(await screen.findByText(route)).toBeInTheDocument();
    expect(authMocks.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ role })
    );
  });

  it("requires selecting a role before creating an account", async () => {
    renderRegister();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("Choose a role before creating your account.")
    ).toBeInTheDocument();
    expect(authMocks.registerUser).not.toHaveBeenCalled();
  });

  it("keeps an existing Google account's persisted role during sign-up", async () => {
    authMocks.signInWithGoogle.mockResolvedValue({
      firebaseUser: { uid: "existing-donor" },
      profile: { id: "existing-donor", name: "Donor", role: "donor" },
    });
    renderRegister();
    fireEvent.click(screen.getByRole("button", { name: /^Collector/ }));
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));

    expect(await screen.findByText("/donor/dashboard")).toBeInTheDocument();
    expect(authMocks.createProfileForAuthenticatedUser).not.toHaveBeenCalled();
    expect(profileMocks.completeUserRoleSelection).not.toHaveBeenCalled();
  });

  it.each([
    ["Donor", "donor", "/donor/dashboard"],
    ["Collector", "collector", "/collector/dashboard"],
    ["Delivery Volunteer", "volunteer", "/volunteer/dashboard"],
  ])("creates a new Google account with the selected %s role", async (label, role, route) => {
    authMocks.signInWithGoogle.mockResolvedValue({
      firebaseUser: { uid: `google-${role}` },
      profile: null,
    });
    authMocks.createProfileForAuthenticatedUser.mockResolvedValue({
      id: `google-${role}`,
      name: "Google User",
      role,
    });

    renderRegister();
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${label}`) })
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));

    expect(await screen.findByText(route)).toBeInTheDocument();
    expect(authMocks.createProfileForAuthenticatedUser).toHaveBeenCalledWith(
      { uid: `google-${role}` },
      role
    );
  });
});
