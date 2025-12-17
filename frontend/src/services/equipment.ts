import { db } from '../db';
import type { Equipment, EquipmentCategory, EquipmentWithCategory } from '../db/models';

// 資機材一覧取得
export async function getEquipmentList(options?: {
  categoryId?: number;
  includeInactive?: boolean;
}): Promise<EquipmentWithCategory[]> {
  let query = db.equipment.filter(e => !e.isDeleted);
  
  if (!options?.includeInactive) {
    query = query.filter(e => e.isActive);
  }
  
  if (options?.categoryId) {
    query = query.filter(e => e.categoryId === options.categoryId);
  }
  
  const equipmentList = await query.toArray();
  
  // カテゴリ情報を付加
  const result: EquipmentWithCategory[] = [];
  for (const equipment of equipmentList) {
    let category: EquipmentCategory | undefined;
    if (equipment.categoryId) {
      category = await db.categories.get(equipment.categoryId);
    }
    result.push({ ...equipment, category });
  }
  
  return result;
}

// 資機材詳細取得
export async function getEquipment(id: number): Promise<EquipmentWithCategory | null> {
  const equipment = await db.equipment.get(id);
  if (!equipment || equipment.isDeleted) return null;
  
  let category: EquipmentCategory | undefined;
  if (equipment.categoryId) {
    category = await db.categories.get(equipment.categoryId);
  }
  
  return { ...equipment, category };
}

// 資機材作成
export async function createEquipment(data: {
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  categoryId?: number;
  isUnlimited?: boolean;
  specifications?: Record<string, unknown>;
  imageData?: string;
}): Promise<{ success: boolean; equipment?: Equipment; error?: string }> {
  const now = new Date();
  
  try {
    const id = await db.equipment.add({
      name: data.name,
      description: data.description,
      quantity: data.quantity,
      location: data.location,
      categoryId: data.categoryId,
      isActive: true,
      isUnlimited: data.isUnlimited ?? false,
      isDeleted: false,
      specifications: data.specifications,
      imageData: data.imageData,
      createdAt: now,
      updatedAt: now
    });
    
    const equipment = await db.equipment.get(id);
    return { success: true, equipment: equipment! };
  } catch (error) {
    return { success: false, error: '資機材の作成に失敗しました' };
  }
}

// 資機材更新
export async function updateEquipment(
  id: number,
  data: Partial<Omit<Equipment, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const equipment = await db.equipment.get(id);
  if (!equipment) {
    return { success: false, error: '資機材が見つかりません' };
  }
  
  await db.equipment.update(id, { ...data, updatedAt: new Date() });
  return { success: true };
}

// 資機材削除（論理削除）
export async function deleteEquipment(id: number): Promise<{ success: boolean; error?: string }> {
  const equipment = await db.equipment.get(id);
  if (!equipment) {
    return { success: false, error: '資機材が見つかりません' };
  }
  
  await db.equipment.update(id, { isDeleted: true, updatedAt: new Date() });
  return { success: true };
}

// カテゴリ一覧取得
export async function getCategories(): Promise<EquipmentCategory[]> {
  return db.categories.toArray();
}

// カテゴリ作成
export async function createCategory(data: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; category?: EquipmentCategory; error?: string }> {
  const now = new Date();
  
  try {
    const id = await db.categories.add({
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now
    });
    
    const category = await db.categories.get(id);
    return { success: true, category: category! };
  } catch (error) {
    return { success: false, error: 'カテゴリの作成に失敗しました' };
  }
}

// カテゴリ更新
export async function updateCategory(
  id: number,
  data: Partial<Omit<EquipmentCategory, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const category = await db.categories.get(id);
  if (!category) {
    return { success: false, error: 'カテゴリが見つかりません' };
  }
  
  await db.categories.update(id, { ...data, updatedAt: new Date() });
  return { success: true };
}

// カテゴリ削除
export async function deleteCategory(id: number): Promise<{ success: boolean; error?: string }> {
  const category = await db.categories.get(id);
  if (!category) {
    return { success: false, error: 'カテゴリが見つかりません' };
  }
  
  // カテゴリに紐づく資機材のカテゴリをnullに
  const equipmentInCategory = await db.equipment.where('categoryId').equals(id).toArray();
  for (const equipment of equipmentInCategory) {
    await db.equipment.update(equipment.id!, { categoryId: undefined, updatedAt: new Date() });
  }
  
  await db.categories.delete(id);
  return { success: true };
}

// 画像をBase64に変換
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
