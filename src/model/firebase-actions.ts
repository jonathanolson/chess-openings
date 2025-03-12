import { auth, googleProvider } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  User,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Property } from "scenerystack/axon";

export const userProperty = new Property<User | null>(null);
export const isUserLoadedProperty = new Property<boolean>(false);

export const userLoadedPromise = new Promise<void>((resolve) => {
  isUserLoadedProperty.link((isUserLoaded) => {
    if (isUserLoaded) {
      resolve();
    }
  });
});
export const userPromise = new Promise<User>((resolve) => {
  userProperty.link((user) => {
    if (user) {
      resolve(user);
    }
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userProperty.value = user;
  } else {
    userProperty.value = null;
  }
  isUserLoadedProperty.value = true;
});

(async () => {
  const potentialUser = await checkRedirect();

  if (potentialUser) {
    userProperty.value = potentialUser;
    isUserLoadedProperty.value = true;
  }
})();

export async function signInWithGoogle(): Promise<User> {
  console.log(`current user ${auth.currentUser}`);
  const result = await signInWithPopup(auth, googleProvider);
  console.log("User signed in:", result.user);
  console.log("User ID (uid):", result.user.uid);
  return result.user;
}

export async function signInWithGoogleRedirect(): Promise<void> {
  console.log(`current user ${auth.currentUser}`);
  await signInWithRedirect(auth, googleProvider);
}

export async function checkRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth);

  if (result) {
    console.log("User signed in:", result.user);
    console.log("User ID (uid):", result.user.uid);
    return result.user;
  } else {
    console.log("No user signed in.");
    return null;
  }
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
): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  console.log("User signed in:", userCredential.user);
  console.log("User ID (uid):", userCredential.user.uid);
  return userCredential.user;
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

// @ts-expect-error defining a global
window.manualSave = async (data) => {
  await saveUserState(userProperty.value!.uid, data);
};
