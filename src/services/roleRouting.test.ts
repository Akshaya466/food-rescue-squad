import { afterEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "./authService";
import { getDashboardRoute, getEffectiveRole } from "./roleRouting";
import { resolveActiveUserProfile, selectUserRole } from "./userService";

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
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
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
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

  it("keeps volunteer registration as a pending donor request", async () => {
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

    expect(user.role).toBe("donor");
    expect(user.requestedRole).toBe("volunteer");
    expect(getDashboardRoute(getEffectiveRole(user))).toBe("/donor/dashboard");
  });
});

describe("role routing", () => {
  it("does not treat volunteer requests as active volunteer roles", () => {
    expect(getEffectiveRole({ role: "donor", requestedRole: "volunteer" })).toBe("donor");
    expect(getDashboardRoute(getEffectiveRole({ role: "donor", requestedRole: "volunteer" }))).toBe(
      "/donor/dashboard"
    );
  });

  it("routes existing collector applicants with a donor role mismatch to the collector dashboard", () => {
    expect(getEffectiveRole({ role: "donor", requestedRole: "collector" })).toBe("collector");
    expect(getDashboardRoute(getEffectiveRole({ role: "donor", requestedRole: "collector" }))).toBe(
      "/collector/dashboard"
    );
  });

  it("keeps donor and volunteer routing unchanged", () => {
    expect(getEffectiveRole({ role: "donor" })).toBe("donor");
    expect(getDashboardRoute("donor")).toBe("/donor/dashboard");
    expect(getEffectiveRole({ role: "volunteer" })).toBe("volunteer");
    expect(getDashboardRoute("volunteer")).toBe("/volunteer/dashboard");
    expect(getDashboardRoute("admin")).toBe("/admin/dashboard");
  });
});

describe("Google role onboarding", () => {
  const snapshot = (profile: Record<string, unknown>) => ({
    exists: () => true,
    id: "google-user",
    data: () => profile,
  });

  describe("existing collector applicant sign-in", () => {
    it("persists the collector role before resolving the profile as active", async () => {
      firestoreMocks.doc.mockReturnValue("legacy-profile");
      firestoreMocks.getDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: "legacy-user",
          data: () => ({ role: "donor", requestedRole: "collector" }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: "legacy-user",
          data: () => ({ role: "donor", requestedRole: "collector" }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: "legacy-user",
          data: () => ({ role: "collector" }),
        });

      const profile = await resolveActiveUserProfile("legacy-user");

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        "legacy-profile",
        { role: "collector", requestedRole: "delete-field" }
      );
      expect(profile?.role).toBe("collector");
    });
  });

  it("persists collector activation before returning from Google onboarding", async () => {
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc
      .mockResolvedValueOnce(snapshot({ role: "donor", requestedRole: "volunteer" }))
      .mockResolvedValueOnce(snapshot({ role: "collector" }));

    const profile = await selectUserRole("google-user", "collector");

    expect(firestoreMocks.updateDoc).toHaveBeenNthCalledWith(
      1,
      "google-profile",
      { requestedRole: "collector" }
    );
    expect(firestoreMocks.updateDoc).toHaveBeenNthCalledWith(
      2,
      "google-profile",
      { role: "collector", requestedRole: "delete-field" }
    );
    expect(profile.role).toBe("collector");
  });

  it("leaves Google volunteer selections pending as donors", async () => {
    firestoreMocks.doc.mockReturnValue("google-profile");
    firestoreMocks.getDoc
      .mockResolvedValueOnce(snapshot({ role: "donor" }))
      .mockResolvedValueOnce(snapshot({ role: "donor", requestedRole: "volunteer" }));

    const profile = await selectUserRole("google-user", "volunteer");

    expect(firestoreMocks.updateDoc).toHaveBeenCalledOnce();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      "google-profile",
      { requestedRole: "volunteer" }
    );
    expect(profile.role).toBe("donor");
    expect(getEffectiveRole(profile)).toBe("donor");
  });

  it("promotes an existing donor collector applicant and confirms the stored role", async () => {
    firestoreMocks.doc.mockReturnValue("collector-profile");
    firestoreMocks.getDoc
      .mockResolvedValueOnce(snapshot({ role: "donor", requestedRole: "collector" }))
      .mockResolvedValueOnce(snapshot({ role: "collector" }));

    const profile = await selectUserRole("google-user", "collector");

    expect(firestoreMocks.updateDoc).toHaveBeenCalledOnce();
    expect(profile.role).toBe("collector");
  });
});
