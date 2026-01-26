import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type {
  Equipment,
  EquipmentListResponse,
  EquipmentCategory,
  CategoryInput,
} from "../types/equipment";

// ========== 資機材 API ==========

export interface EquipmentQueryParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

// Google Drive URLをプレビュー用に変換するヘルパー（プレビュー専用）
export const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return "";

  // すでに thumbnail 形式の場合はそのまま返す
  if (url.includes("thumbnail?id=")) {
    return url;
  }

  // ファイルIDを抽出
  let fileId: string | null = null;

  // /d/FILE_ID/ 形式
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) {
    fileId = dMatch[1];
  }

  // id=FILE_ID 形式
  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  // ファイルIDのみの場合
  if (!fileId && url.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    fileId = url;
  }

  // ファイルIDが見つかった場合、サムネイルURLを返す
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  // その他はそのまま返す
  return url;
};

// ヘルパー: FirestoreドキュメントをEquipment型に変換
const mapDocToEquipment = (doc: any): Equipment => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Equipment;
};

// 資機材一覧取得
export const getEquipmentList = async (
  params?: EquipmentQueryParams,
): Promise<EquipmentListResponse> => {
  const equipmentRef = collection(db, "equipments");
  let q = query(equipmentRef, where("isDeleted", "==", false));

  if (params?.categoryId) {
    q = query(q, where("categoryId", "==", params.categoryId));
  }

  if (params?.isActive !== undefined) {
    q = query(q, where("isActive", "==", params.isActive));
  }

  const querySnapshot = await getDocs(q);
  let items = querySnapshot.docs.map(mapDocToEquipment);

  // クライアント側での検索フィルタ（Firestoreは全文検索が弱いため）
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower),
    );
  }

  return {
    items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
};

// 資機材詳細取得
export const getEquipment = async (id: string): Promise<Equipment> => {
  const docRef = doc(db, "equipments", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Equipment not found");
  }
  return mapDocToEquipment(docSnap);
};

// 資機材作成（Google Drive URL対応）
export const createEquipment = async (
  formData: FormData,
): Promise<Equipment> => {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string, 10);
  const location = formData.get("location") as string;
  const categoryId = formData.get("categoryId") as string;
  const isActive = formData.get("isActive") === "true";
  // 画像URLはそのまま保存（変換は表示時に行う）
  const imageUrl = (formData.get("imageUrl") as string) || "";

  const equipmentData = {
    name,
    description,
    quantity,
    location,
    categoryId,
    imageUrl,
    isActive,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "equipments"), equipmentData);
  return {
    id: docRef.id,
    ...equipmentData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any;
};

// 資機材更新（Google Drive URL対応）
export const updateEquipment = async (
  id: string,
  formData: FormData,
): Promise<Equipment> => {
  const equipmentRef = doc(db, "equipments", id);
  const docSnap = await getDoc(equipmentRef);
  if (!docSnap.exists()) throw new Error("Equipment not found");

  const currentData = docSnap.data();
  const updates: any = {
    updatedAt: serverTimestamp(),
  };

  if (formData.has("name")) updates.name = formData.get("name");
  if (formData.has("description"))
    updates.description = formData.get("description");
  if (formData.has("quantity"))
    updates.quantity = parseInt(formData.get("quantity") as string, 10);
  if (formData.has("location")) updates.location = formData.get("location");
  if (formData.has("categoryId"))
    updates.categoryId = formData.get("categoryId");
  if (formData.has("isActive"))
    updates.isActive = formData.get("isActive") === "true";

  // 画像URL処理（Google Drive URL対応）
  const imageUrlInput = formData.get("imageUrl") as string;
  const removeImage = formData.get("removeImage") === "true";

  if (removeImage) {
    updates.imageUrl = "";
  } else if (imageUrlInput !== null && imageUrlInput !== undefined) {
    // URLはそのまま保存（変換は表示時に行う）
    updates.imageUrl = imageUrlInput;
  }

  await updateDoc(equipmentRef, updates);
  return { id, ...currentData, ...updates } as any;
};

// 資機材削除（論理削除）
export const deleteEquipment = async (id: string): Promise<void> => {
  const docRef = doc(db, "equipments", id);
  await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
};

// ========== カテゴリ API ==========

// カテゴリ一覧取得
export const getCategories = async (): Promise<EquipmentCategory[]> => {
  const querySnapshot = await getDocs(collection(db, "categories"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt:
      (doc.data().createdAt as Timestamp)?.toDate().toISOString() ||
      new Date().toISOString(),
    updatedAt:
      (doc.data().updatedAt as Timestamp)?.toDate().toISOString() ||
      new Date().toISOString(),
  })) as EquipmentCategory[];
};

// カテゴリ作成
export const createCategory = async (
  data: CategoryInput,
): Promise<EquipmentCategory> => {
  const categoryData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "categories"), categoryData);
  return { id: docRef.id, ...categoryData } as any;
};

// カテゴリ更新
export const updateCategory = async (
  id: string,
  data: CategoryInput,
): Promise<EquipmentCategory> => {
  const docRef = doc(db, "categories", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return { id, ...data } as any;
};

// カテゴリ削除
export const deleteCategory = async (id: string): Promise<void> => {
  const docRef = doc(db, "categories", id);
  await deleteDoc(docRef);
};
