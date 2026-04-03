import { User } from "@/types";

// Mock current user — swap with Firebase Auth later
let currentUser: User | null = {
  id: "u1",
  name: "Priya Sharma",
  email: "priya@greenplate.in",
  role: "donor",
  orgName: "GreenPlate Catering",
  phone: "+91 98765 43210",
  location: { lat: 13.0827, lng: 80.2707, address: "T. Nagar, Chennai" },
  avatarUrl: "",
  trustScore: 4.8,
  totalRescues: 124,
  isVerified: true,
  createdAt: "2024-06-15",
};

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  orgName?: string;
  phone: string;
}): Promise<User> {
  // TODO: Replace with firebase auth createUserWithEmailAndPassword + Firestore profile
  const user: User = {
    id: "u_" + Date.now(),
    name: data.name,
    email: data.email,
    role: data.role,
    orgName: data.orgName,
    phone: data.phone,
    location: { lat: 13.0827, lng: 80.2707, address: "Chennai" },
    trustScore: 5.0,
    totalRescues: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };
  currentUser = user;
  return user;
}

export async function loginUser(_email: string, _password: string): Promise<User> {
  // TODO: Replace with firebase auth signInWithEmailAndPassword
  if (!currentUser) throw new Error("Invalid credentials");
  return currentUser;
}

export async function logoutUser(): Promise<void> {
  // TODO: Replace with firebase auth signOut
  currentUser = null;
}

export function getCurrentUser(): User | null {
  // TODO: Replace with firebase auth onAuthStateChanged
  return currentUser;
}

export function setMockRole(role: User["role"]) {
  if (currentUser) currentUser = { ...currentUser, role };
}
