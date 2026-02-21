import admin from "firebase-admin";
import { db } from "../lib/firebase";

const equipmentCollection = () => db.collection("equipments");
const categoryCollection = () => db.collection("categories");

const Timestamp = admin.firestore.Timestamp;

// ========== 資機材 ==========

export interface EquipmentData {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  imageUrl?: string;
  isActive: boolean;
  isUnlimited?: boolean;
  isDeleted?: boolean;
  specifications?: Record<string, unknown>;
  categoryId?: string;
  category?: CategoryData;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

export interface CategoryData {
  id?: string;
  name: string;
  description?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

function docToEquipment(
  doc: admin.firestore.DocumentSnapshot
): EquipmentData & { id: string } {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description || undefined,
    quantity: data.quantity ?? 0,
    location: data.location || undefined,
    imageUrl: data.imageUrl || undefined,
    isActive: data.isActive ?? true,
    isUnlimited: data.isUnlimited ?? false,
    isDeleted: data.isDeleted ?? false,
    specifications: data.specifications || undefined,
    categoryId: data.categoryId || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function docToCategory(
  doc: admin.firestore.DocumentSnapshot
): CategoryData & { id: string } {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ---------- find ----------

export async function findAllEquipment(options?: {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ items: (EquipmentData & { id: string })[]; total: number }> {
  // 複合インデックスを避けるため全件取得し、アプリケーション側でフィルタ
  const snapshot = await equipmentCollection().get();
  let items = snapshot.docs.map(docToEquipment);

  // isDeletedフィルター（デフォルトで除外）
  if (!options?.includeDeleted) {
    items = items.filter((item) => !item.isDeleted);
  }

  // カテゴリフィルター
  if (options?.categoryId) {
    items = items.filter((item) => item.categoryId === options.categoryId);
  }

  // isActiveフィルター
  if (options?.isActive !== undefined) {
    items = items.filter((item) => item.isActive === options.isActive);
  }

  // 名前順でソート
  items.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  // テキスト検索（Firestoreのネイティブ全文検索はないため、アプリケーション側でフィルタ）
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.description?.toLowerCase().includes(searchLower) ?? false) ||
        (item.location?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  const total = items.length;

  // ページネーション
  if (options?.page && options?.limit) {
    const skip = (options.page - 1) * options.limit;
    items = items.slice(skip, skip + options.limit);
  }

  // カテゴリ情報を付加
  const categoryIds = [
    ...new Set(items.map((i) => i.categoryId).filter(Boolean)),
  ];
  if (categoryIds.length > 0) {
    const categoryMap = new Map<string, CategoryData>();
    for (const catId of categoryIds) {
      const catDoc = await categoryCollection().doc(catId!).get();
      if (catDoc.exists) {
        categoryMap.set(catId!, docToCategory(catDoc));
      }
    }
    items = items.map((item) => ({
      ...item,
      category: item.categoryId
        ? categoryMap.get(item.categoryId) || undefined
        : undefined,
    }));
  }

  return { items, total };
}

export async function findEquipmentById(
  id: string
): Promise<(EquipmentData & { id: string }) | null> {
  const doc = await equipmentCollection().doc(id).get();
  if (!doc.exists) return null;
  const equipment = docToEquipment(doc);

  // カテゴリ情報を付加
  if (equipment.categoryId) {
    const catDoc = await categoryCollection().doc(equipment.categoryId).get();
    if (catDoc.exists) {
      equipment.category = docToCategory(catDoc);
    }
  }

  return equipment;
}

export async function createEquipment(
  data: Omit<EquipmentData, "id" | "createdAt" | "updatedAt">
): Promise<EquipmentData & { id: string }> {
  const now = Timestamp.now();
  const docRef = await equipmentCollection().add({
    ...data,
    isActive: data.isActive ?? true,
    isUnlimited: data.isUnlimited ?? false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });
  const created = await docRef.get();
  return docToEquipment(created);
}

export async function updateEquipment(
  id: string,
  data: Partial<EquipmentData>
): Promise<(EquipmentData & { id: string }) | null> {
  const docRef = equipmentCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  // id, createdAt は更新しない
  delete updateData.id;
  delete updateData.createdAt;
  delete updateData.category; // ネストされたカテゴリオブジェクトは保存しない

  await docRef.update(updateData);
  return findEquipmentById(id);
}

export async function deleteEquipment(id: string): Promise<boolean> {
  const docRef = equipmentCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return false;

  // 論理削除
  await docRef.update({
    isDeleted: true,
    isActive: false,
    updatedAt: Timestamp.now(),
  });
  return true;
}

// ========== カテゴリ ==========

export async function findAllCategories(): Promise<
  (CategoryData & { id: string })[]
> {
  const snapshot = await categoryCollection().orderBy("name", "asc").get();
  return snapshot.docs.map(docToCategory);
}

export async function findCategoryById(
  id: string
): Promise<(CategoryData & { id: string }) | null> {
  const doc = await categoryCollection().doc(id).get();
  if (!doc.exists) return null;
  return docToCategory(doc);
}

export async function createCategory(
  data: Omit<CategoryData, "id" | "createdAt" | "updatedAt">
): Promise<CategoryData & { id: string }> {
  const now = Timestamp.now();
  const docRef = await categoryCollection().add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  const created = await docRef.get();
  return docToCategory(created);
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryData>
): Promise<(CategoryData & { id: string }) | null> {
  const docRef = categoryCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  delete updateData.id;
  delete updateData.createdAt;

  await docRef.update(updateData);
  const updated = await docRef.get();
  return docToCategory(updated);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const docRef = categoryCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return false;
  await docRef.delete();
  return true;
}
