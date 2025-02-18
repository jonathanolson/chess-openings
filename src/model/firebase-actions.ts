import { auth, googleProvider } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  console.log("User signed in:", result.user);
  console.log("User ID (uid):", result.user.uid);
  return result.user.uid;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  console.log("User signed up:", userCredential.user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  console.log("User signed in:", userCredential.user);
  console.log("User ID (uid):", userCredential.user.uid);
  return userCredential.user.uid;
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

export async function saveUserState<T>(
  userId: string,
  state: T,
): Promise<void> {
  await setDoc(doc(db, "users", userId), { state });
  console.log("User state saved successfully!");
}

export async function loadUserState<T>(userId: string): Promise<T | null> {
  const docSnap = await getDoc(doc(db, "users", userId));
  if (docSnap.exists()) {
    console.log("User state:", docSnap.data().state);
    return docSnap.data().state;
  } else {
    console.log("No user state found.");
    return null;
  }
}
