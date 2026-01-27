/**
 * 重複カテゴリを削除するスクリプト
 * 使用方法: npx ts-node --esm src/scripts/cleanup-categories.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcqtL5wqF_aghHFHARDEBEIa_YckuHA8M",
  authDomain: "sazanwiz-app.firebaseapp.com",
  projectId: "sazanwiz-app",
  storageBucket: "sazanwiz-app.firebasestorage.app",
  messagingSenderId: "316947471026",
  appId: "1:316947471026:web:442284b40e204407a3c7ab",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 正しいカテゴリID（fix-categories.tsで作成したもの）
const CORRECT_CATEGORY_IDS = [
  "cat_resuscitation",
  "cat_training",
  "cat_machinery",
  "cat_consumables",
];

async function cleanupCategories() {
  console.log("🧹 重複カテゴリのクリーンアップを開始します...\n");

  try {
    // 全カテゴリを取得
    const categoryRef = collection(db, "categories");
    const snapshot = await getDocs(categoryRef);

    console.log(`📁 全カテゴリ数: ${snapshot.docs.length}`);

    // 重複（正しいID以外）を削除
    const duplicates = snapshot.docs.filter(
      (doc) => !CORRECT_CATEGORY_IDS.includes(doc.id),
    );

    console.log(`🗑️  削除対象: ${duplicates.length} 件\n`);

    for (const dup of duplicates) {
      const data = dup.data();
      console.log(`  削除: ${data.name} (ID: ${dup.id})`);
      await deleteDoc(doc(db, "categories", dup.id));
    }

    console.log(`\n✅ クリーンアップ完了！`);
    console.log(`   残りのカテゴリ: ${CORRECT_CATEGORY_IDS.length} 件`);
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupCategories();
