import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
  localStorage.setItem("foodbridge_user", JSON.stringify(user));

  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Get user profile from Firestore
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("User profile not found");

  const user = snap.data() as User;

  // Save to localStorage
  localStorage.setItem("foodbridge_user", JSON.stringify(user));

  return user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem("foodbridge_user");
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem("foodbridge_user");
  return stored ? JSON.parse(stored) : null;
}

export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        const user = snap.data() as User;
        localStorage.setItem("foodbridge_user", JSON.stringify(user));
        callback(user);
      } else {
        callback(null);
      }
    } else {
      localStorage.removeItem("foodbridge_user");
      callback(null);
    }
  });
}