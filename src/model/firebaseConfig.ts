import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your Firebase config (replace with your actual credentials)
const firebaseConfig = {
  apiKey: "AIzaSyCmmMBXWcWmljEO9lWGK7VNqrvNI3Zu1bI",
  authDomain: "chess-openings-7a1b2.firebaseapp.com",
  projectId: "chess-openings-7a1b2",
  storageBucket: "chess-openings-7a1b2.firebasestorage.app",
  messagingSenderId: "800214788543",
  appId: "1:800214788543:web:85b95d62fd65068180d90a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
