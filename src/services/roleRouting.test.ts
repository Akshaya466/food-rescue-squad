import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProfileForAuthenticatedUser,
  registerUser,
  signInWithGoogle,
} from "./authService";
import { getDashboardRoute, getEffectiveRole } from "./roleRouting";
import {
  completeUserRoleSelection,
  resolveActiveUserProfile,
} from "./userService";

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => "delete-field"),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: authMocks.GoogleAuthProvider,
  signInWithPopup: authMocks.signInWithPopup,
}));

vi.mock("firebase/firestore", () => ({
  doc: firestoreMocks.doc,
  setDoc: firestoreMocks.setDoc,
  getDoc: firestoreMocks.getDoc,
  updateDoc: firestoreMocks.updateDoc,
  deleteField: firestoreMocks.deleteField,
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("@/config/firebase", () => ({ auth: {}, db: {} }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("collector and donor registration flow", () => {
  it("stores collector signups as a collector and routes them to the collector dashboard", async () => {
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "collector-1" },
    });
    firestoreMocks.doc.mockReturnValue("user-doc");

    const user = await registerUser({
      name: "Collector User",
      email: "collector@example.com",
      password: "password123",
      role: "collector",
      orgName: "Food Bank",
      phone: "9876543210",
      city: "Chennai",
    });

    expect(user.role).toBe("collector");
    expect(user.requestedRole).toBeUndefined();
    expect(getDashboardRoute(user.role)).toBe("/collector/dashboard");
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: "collector" })
    );
    expect(firestoreMocks.setDoc.mock.calls[0][1]).not.toHaveProperty("requestedRole");
  });

  it("keeps donor registration and dashboard routing unchanged", async () => {
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "donor-1" },
    });

    const user = await registerUser({
      name: "Donor User",
      email: "donor@example.com",
      password: "password123",
      role: "donor",
      phone: "9876543210",
      city: "Chennai",
    });

    expect(user.role).toBe("donor");
    expect(user.requestedRole).toBeUndefined();
    expect(getDashboardRoute(user.role)).toBe("/donor/dashboard");
  });

  it("registers delivery volunteers with the active volunteer role", async () => {
    authMocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: "volunteer-1" },
    });

    const user = await registerUser({
      name: "Volunteer User",
      email: "volunteer@example.com",
      password: "password123",
      role: "volunteer",
      phone: "9876543210",
      city: "Chennai",
    });

    expect(user.role).toBe("volunteer");
    expect(user.requestedRole).toBeUndefined();
    expect(getDashboardRoute(getEffectiveRole(user))).toBe("/volunteer/dashboard");
  });
});

describe("role routing", () => {
  it("routes by the persisted role rather than inferring from role requests", () => {
    expect(getEffectiveRole({ role: "donor", requestedRole: "volunteer" })).toBe("donor");
    expect(getDashboardRoute(getEffectiveRole({ role: "donor", requestedRole: "volunteer" }))).toBe(
      "/donor/dashboard"
    );
    expect(getEffectiveRole({ role: "donor", requestedRole: "collector" })).toBe("donor");
  });

  it("keeps donor and volunteer routing unchanged", () => {
    expect(getEffectiveRole({ role: "donor" })).toBe("donor");
    expect(getDashboardRoute("donor")).toBe("/donor/dashboard");
    expect(getEffectiveRole({ role: "volunteer" })).toBe("volunteer");
    expect(getDashboardRoute("volunteer")).toBe("/volunteer/dashboard");
    expect(getDashboardRoute("admin")).toBe("/admin/dashboard");
  });

  it("returns no active role for a missing or invalid role", () => {
    expect(getEffectiveRole(null)).toBeNull();
    expect(getEffectiveRole({ role: undefined as never })).toBeNull();
  });
});

describe("role completion and sign-in", () => {
  const snapshot = (profile: Record<string, unknown>) => ({
    exists: () => true,
    id: "google-user",
    data: () => profile,
  });

  it("does not change an existing collector applicant's role during sign-in", async () => {
    firestoreMocks.doc.mockReturnValue("legacy-profile");
    firestoreMocks.getDoc.mockResolvedValueOnce(
      snapshot({ role: "donor", requestedRole: "collector" })
    );

    const profile = await resolveActiveUserProfile("legacy-user");

    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
    expect(profile?.role).toBe("donor");
  });

  it("lets a roleless profile select a role without overwriting its other data", async () => {
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc
      .mockResolvedValueOnce(snapshot({ name: "Google User" }))
      .mockResolvedValueOnce(snapshot({ role: "volunteer", name: "Google User" }));

    const profile = await completeUserRoleSelection("google-user", "volunteer");

    expect(firestoreMocks.updateDoc).toHaveBeenCalledOnce();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith("google-profile", {
      role: "volunteer",
      requestedRole: "delete-field",
    });
    expect(profile.role).toBe("volunteer");
  });

  it("refuses to replace an existing valid role during role completion", async () => {
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc.mockResolvedValueOnce(snapshot({ role: "donor" }));

    await expect(
      completeUserRoleSelection("google-user", "collector")
    ).rejects.toThrow("This account already has a valid role.");
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it("reads existing Google profiles without creating or changing their role", async () => {
    const firebaseUser = {
      uid: "google-user",
      displayName: "Google User",
      email: "google@example.com",
    };
    authMocks.signInWithPopup.mockResolvedValueOnce({ user: firebaseUser });
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc.mockResolvedValueOnce(
      snapshot({ role: "donor", name: "Google User" })
    );

    const result = await signInWithGoogle();

    expect(result.profile?.role).toBe("donor");
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it("creates a Google profile with the selected role when no profile exists", async () => {
    const firebaseUser = {
      uid: "google-new-volunteer",
      displayName: "New Volunteer",
      email: "volunteer@example.com",
    };
    authMocks.signInWithPopup.mockResolvedValueOnce({ user: firebaseUser });
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => false,
    });
    const result = await signInWithGoogle();

    expect(result.profile).toBeNull();
    const profile = await createProfileForAuthenticatedUser(
      firebaseUser as never,
      "volunteer"
    );
    expect(profile.role).toBe("volunteer");
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      "google-profile",
      expect.objectContaining({ role: "volunteer" })
    );
  });

  it("does not promote an existing donor collector applicant during role selection", async () => {
    firestoreMocks.doc.mockReturnValue("collector-profile");
    firestoreMocks.getDoc.mockResolvedValueOnce(
      snapshot({ role: "donor", requestedRole: "collector" })
    );

    await expect(
      completeUserRoleSelection("google-user", "collector")
    ).rejects.toThrow("This account already has a valid role.");

    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });
});
