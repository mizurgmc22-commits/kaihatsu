/// <reference types="node" />
/**
 * ローカルパス形式のimageUrlをクリアするスクリプト
 * 
 * 使い方:
 * cd frontend
 * npx ts-node --esm scripts/clear-local-image-urls.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

// Firebase設定（.envから読み込まれるべきだが、ここでは直接指定）
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBQvSIx0tKBo_8wAiJYGc-VhSS7lF_M0kU",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "southern-62f95.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "southern-62f95",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "southern-62f95.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "411063353476",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:411063353476:web:ad1d4f38b7dbda4f720f6c",
};

async function main() {
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Fetching equipment collection...");
  const equipmentRef = collection(db, "equipment");
  const snapshot = await getDocs(equipmentRef);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const imageUrl = data.imageUrl;

    // ローカルパス形式かどうかをチェック
    // /api/uploads/ で始まるか、http://localhost を含むURLは無効
    if (imageUrl && (
      imageUrl.startsWith("/api/uploads/") || 
      imageUrl.includes("localhost") ||
      imageUrl.startsWith("uploads/")
    )) {
      console.log(`Clearing imageUrl for: ${data.name} (was: ${imageUrl})`);
      
      await updateDoc(doc(db, "equipment", docSnapshot.id), {
        imageUrl: "",
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\nDone!`);
  console.log(`Updated: ${updatedCount} items`);
  console.log(`Skipped: ${skippedCount} items (already valid or no imageUrl)`);
}

main().catch(console.error);
