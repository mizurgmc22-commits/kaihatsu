/**
 * Firestoreのカテゴリと機器のカテゴリIDを修正するスクリプト
 * 使用方法: npx ts-node --esm src/scripts/fix-categories.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
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

// カテゴリ定義
const CATEGORIES = [
  {
    id: "cat_resuscitation",
    name: "蘇生講習資機材",
    description: "CPR・AED等の蘇生訓練用機材",
  },
  {
    id: "cat_training",
    name: "トレーニング資機材",
    description: "手技訓練・シミュレーター等",
  },
  {
    id: "cat_machinery",
    name: "機械類",
    description: "手術器具・ピンセット等",
  },
  { id: "cat_consumables", name: "消耗品", description: "使い捨て・消耗品類" },
];

// 機器名とカテゴリの対応表
const EQUIPMENT_CATEGORY_MAP: Record<string, string> = {
  // 蘇生講習資機材
  "ALS Simulator": "cat_resuscitation",
  "Resusci Anne": "cat_resuscitation",
  セーブマン: "cat_resuscitation",
  ナーシングアン: "cat_resuscitation",
  シムベビー: "cat_resuscitation",
  リトルアン: "cat_resuscitation",
  リトルジュニア: "cat_resuscitation",
  ベビーアン: "cat_resuscitation",
  新生児蘇生モデル: "cat_resuscitation",
  AEDトレーナー: "cat_resuscitation",
  モニター付き除細動器: "cat_resuscitation",
  気道管理トレーナー: "cat_resuscitation",
  気道管理セット: "cat_resuscitation",
  "蘇生（点滴）セット": "cat_resuscitation",

  // トレーニング資機材
  フェモララインマン: "cat_training",
  動脈注射トレーニングアーム: "cat_training",
  "採血・静注シミュレータ シンジョー": "cat_training",
  CVC穿刺挿入シミュレーター: "cat_training",
  エンドワークプロII: "cat_training",
  心臓手術訓練用バイパス訓練装置: "cat_training",
  "低侵襲心臓外科手術(MICS)訓練装置": "cat_training",
  "ANGIO-Mentor スリムデュアル": "cat_training",
  ラップメンター: "cat_training",
  超音波トレーニングシミュレーター: "cat_training",
  経食道心エコー基本システム: "cat_training",
  超音波画像診断装置: "cat_training",
  "上部消化管・ERCP研修モデル": "cat_training",
  マイクロ実体顕微鏡システム: "cat_training",
  PROMPT分娩介助教育トレーナー: "cat_training",
  ソフィー産科シミュレーターセット: "cat_training",
  インファントウォーマー: "cat_training",
  全身麻酔装置エスパイアViewPro一式: "cat_training",
  "Choking Charlie": "cat_training",
  "女性導尿&浣腸シミュレーター": "cat_training",
  "男性導尿&洗腸シミュレーター": "cat_training",

  // 機械類
  "鑷子（ピンセット）": "cat_machinery",
  鉗子: "cat_machinery",
  マイクロ鑷子: "cat_machinery",
  マイクロ鉗子: "cat_machinery",
  "マイクロ持針器（止付）": "cat_machinery",
  マイクロ外膜用直剪刀: "cat_machinery",
  切開用反剪刀: "cat_machinery",

  // 消耗品
  針: "cat_consumables",
  スキンマーカー: "cat_consumables",
  防水シート: "cat_consumables",
  模擬血液: "cat_consumables",
};

async function fixCategories() {
  console.log("🔧 Firestoreカテゴリ修正を開始します...\n");

  try {
    // 1. カテゴリを作成/更新
    console.log("📁 カテゴリを作成中...");
    for (const cat of CATEGORIES) {
      const catRef = doc(db, "categories", cat.id);
      await setDoc(catRef, {
        name: cat.name,
        description: cat.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`  ✅ ${cat.name} (${cat.id})`);
    }

    // 2. 機器のcategoryIdを更新
    console.log("\n📦 機器のカテゴリを更新中...");
    const equipmentRef = collection(db, "equipments");
    const snapshot = await getDocs(equipmentRef);

    let updatedCount = 0;
    let skippedCount = 0;

    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.name as string;

      // マッピングから categoryId を取得
      const categoryId = EQUIPMENT_CATEGORY_MAP[name];

      if (categoryId) {
        const eqRef = doc(db, "equipments", docSnap.id);
        batch.update(eqRef, { categoryId });
        console.log(`  ✅ ${name} → ${categoryId}`);
        updatedCount++;
      } else {
        console.log(`  ⚠️  ${name} → カテゴリ未定義（スキップ）`);
        skippedCount++;
      }
    });

    await batch.commit();

    console.log(`\n🎉 完了しました！`);
    console.log(`   更新: ${updatedCount} 件`);
    console.log(`   スキップ: ${skippedCount} 件`);
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }

  process.exit(0);
}

fixCategories();
