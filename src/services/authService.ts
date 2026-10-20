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

export type RegistrationRole = Exclude<User["role"], "admin">;

export interface GoogleSignInResult {
  firebaseUser: FirebaseUser;
  profile: User | null;
}

function buildUserProfile(
  firebaseUser: FirebaseUser,
  role: RegistrationRole,
  details?: { name?: string; phone?: string; city?: string; orgName?: string }
): User {
  return {
    id: firebaseUser.uid,
    name: details?.name || firebaseUser.displayName || "User",
    email: firebaseUser.email || "",
    role,
    orgName: details?.orgName || "",
    phone: details?.phone || "",
    location: {
      lat: 13.0827,
      lng: 80.2707,
      address: details?.city || "Chennai",
    },
    trustScore: 5,
    totalRescues: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: RegistrationRole;
  orgName?: string;
  phone: string;
  city: string;
}): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const user = buildUserProfile(cred.user, data.role, data);
  await setDoc(doc(db, "users", cred.user.uid), user);
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  
}


export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        const user = snap.data() as User;
        
        callback(user);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}


export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  return {
    firebaseUser: cred.user,
    profile: snap.exists()
      ? ({ id: snap.id, ...snap.data() } as User)
      : null,
  };
}

export async function createProfileForAuthenticatedUser(
  firebaseUser: FirebaseUser,
  role: RegistrationRole
): Promise<User> {
  const user = buildUserProfile(firebaseUser, role);
  await setDoc(doc(db, "users", firebaseUser.uid), user);
  return user;
}
