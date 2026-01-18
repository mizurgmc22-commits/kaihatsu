import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAcqtL5wqF_aghHFHARDEBEIa_YckuHA8M",
  authDomain: "sazanwiz-app.firebaseapp.com",
  projectId: "sazanwiz-app",
  storageBucket: "sazanwiz-app.firebasestorage.app",
  messagingSenderId: "316947471026",
  appId: "1:316947471026:web:442284b40e204407a3c7ab",
  measurementId: "G-N0T4EFZ045",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
