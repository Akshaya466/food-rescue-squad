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
  role: Exclude<User["role"], "admin">;
  orgName?: string;
  phone: string;
  city: string;
}): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);

  const user: User = {
    id: cred.user.uid,
    name: data.name,
    email: data.email,
    role: "donor",
    ...(data.role !== "donor" ? { requestedRole: data.role } : {}),
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

  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Get user profile from Firestore
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("User profile not found");

  const user = snap.data() as User;
  return user;
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


export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();

  console.log("Step 1: Starting Google sign-in");

  const cred = await signInWithPopup(auth, provider);

  console.log("Step 2: Google authentication succeeded", cred.user.uid);

  const userRef = doc(db, "users", cred.user.uid);

  console.log("Step 3: Reading user profile");

  let snap;

  try {
    snap = await getDoc(userRef);
    console.log("Step 4: User profile read succeeded", snap.exists());
  } catch (error) {
    console.error("FAILED AT STEP 3: Firestore profile read", error);
    throw error;
  }

  if (snap.exists()) {
    return snap.data() as User;
  }

  console.log("Step 5: Creating new user profile");

  const user: User = {
    id: cred.user.uid,
    name: cred.user.displayName || "User",
    email: cred.user.email || "",
    role: "donor",
    orgName: "",
    phone: "",
    location: {
      lat: 13.0827,
      lng: 80.2707,
      address: "Chennai",
    },
    trustScore: 5.0,
    totalRescues: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, user);
    console.log("Step 6: User profile created successfully");
  } catch (error) {
    console.error("FAILED AT STEP 5: Firestore profile write", error);
    throw error;
  }

  return user;
}
