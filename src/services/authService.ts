import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { User } from "@/types";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  orgName?: string;
  phone: string;
  city: string;
}): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);

  const user: User = {
    id: cred.user.uid,
    name: data.name,
    email: data.email,
    role: data.role,
    orgName: data.orgName || "",
    phone: data.phone,
    location: { lat: 13.0827, lng: 80.2707, address: data.city },
    trustScore: 5.0,
    totalRescues: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore
  await setDoc(doc(db, "users", cred.user.uid), user);

  // Save to localStorage as current user
  localStorage.setItem("Annora_user", JSON.stringify(user));

  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Get user profile from Firestore
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("User profile not found");

  const user = snap.data() as User;

  // Save to localStorage
  localStorage.setItem("Annora_user", JSON.stringify(user));

  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem("Annora_user");
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem("Annora_user");
  return stored ? JSON.parse(stored) : null;
}

export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        const user = snap.data() as User;
        localStorage.setItem("Annora_user", JSON.stringify(user));
        callback(user);
      } else {
        callback(null);
      }
    } else {
      localStorage.removeItem("Annora_user");
      callback(null);
    }
  });
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);

  // Check if user profile exists in Firestore
  const snap = await getDoc(doc(db, "users", cred.user.uid));

  let user: User;

  if (snap.exists()) {
    // Existing user — just load profile
    user = snap.data() as User;
  } else {
    // New user — create profile
    user = {
      id: cred.user.uid,
      name: cred.user.displayName || "User",
      email: cred.user.email || "",
      role: "donor", // default role
      orgName: "",
      phone: "",
      location: { lat: 13.0827, lng: 80.2707, address: "Chennai" },
      trustScore: 5.0,
      totalRescues: 0,
      isVerified: true, // Google accounts are verified
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", cred.user.uid), user);
  }

  localStorage.setItem("foodbridge_user", JSON.stringify(user));
  return user;
}