import * as equipmentService from '../services/equipment';
import type {
  Equipment,
  EquipmentListResponse,
  EquipmentCategory,
  CategoryInput
} from '../types/equipment';
import type { Equipment as DBEquipment, EquipmentCategory as DBCategory, EquipmentWithCategory } from '../db/models';

// 型変換ヘルパー
const toEquipment = (e: EquipmentWithCategory | DBEquipment): Equipment => ({
  id: e.id!,
  name: e.name,
  description: e.description,
  quantity: e.quantity,
  location: e.location,
  imageUrl: (e as EquipmentWithCategory).imageData || e.imageUrl,
  isActive: e.isActive,
  specifications: e.specifications,
  category: (e as EquipmentWithCategory).category ? toCategory((e as EquipmentWithCategory).category!) : undefined,
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString()
});

const toCategory = (c: DBCategory): EquipmentCategory => ({
  id: c.id!,
  name: c.name,
  description: c.description,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString()
});

// ========== 資機材 API ==========

export interface EquipmentQueryParams {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// 資機材一覧取得
export const getEquipmentList = async (params?: EquipmentQueryParams): Promise<EquipmentListResponse> => {
  const list = await equipmentService.getEquipmentList({
    categoryId: params?.categoryId,
    includeInactive: params?.isActive === false ? true : false
  });
  
  // 検索フィルタ
  let filtered = list;
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    filtered = list.filter(e => 
      e.name.toLowerCase().includes(searchLower) ||
      e.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // ページネーション
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  
  return {
    items: items.map(toEquipment),
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit)
    }
  };
};

// 資機材詳細取得
export const getEquipment = async (id: number): Promise<Equipment> => {
  const equipment = await equipmentService.getEquipment(id);
  if (!equipment) throw new Error('資機材が見つかりません');
  return toEquipment(equipment);
};

// 資機材作成
export const createEquipment = async (data: FormData): Promise<Equipment> => {
  const name = data.get('name') as string;
  const description = data.get('description') as string | null;
  const quantity = parseInt(data.get('quantity') as string) || 1;
  const location = data.get('location') as string | null;
  const categoryId = data.get('categoryId') ? parseInt(data.get('categoryId') as string) : undefined;
  const isUnlimited = data.get('isUnlimited') === 'true';
  const imageFile = data.get('image') as File | null;
  
  let imageData: string | undefined;
  if (imageFile && imageFile.size > 0) {
    imageData = await equipmentService.fileToBase64(imageFile);
  }
  
  const result = await equipmentService.createEquipment({
    name,
    description: description || undefined,
    quantity,
    location: location || undefined,
    categoryId,
    isUnlimited,
    imageData
  });
  
  if (!result.success) throw new Error(result.error);
  return toEquipment(result.equipment!);
};

// 資機材更新
export const updateEquipment = async (id: number, data: FormData): Promise<Equipment> => {
  const updateData: Parameters<typeof equipmentService.updateEquipment>[1] = {};
  
  if (data.has('name')) updateData.name = data.get('name') as string;
  if (data.has('description')) updateData.description = data.get('description') as string;
  if (data.has('quantity')) updateData.quantity = parseInt(data.get('quantity') as string);
  if (data.has('location')) updateData.location = data.get('location') as string;
  if (data.has('categoryId')) updateData.categoryId = parseInt(data.get('categoryId') as string) || undefined;
  if (data.has('isUnlimited')) updateData.isUnlimited = data.get('isUnlimited') === 'true';
  if (data.has('isActive')) updateData.isActive = data.get('isActive') === 'true';
  
  const imageFile = data.get('image') as File | null;
  if (imageFile && imageFile.size > 0) {
    updateData.imageData = await equipmentService.fileToBase64(imageFile);
  }
  
  const result = await equipmentService.updateEquipment(id, updateData);
  if (!result.success) throw new Error(result.error);
  
  const equipment = await equipmentService.getEquipment(id);
  if (!equipment) throw new Error('資機材が見つかりません');
  return toEquipment(equipment);
};

// 資機材削除（論理削除）
export const deleteEquipment = async (id: number): Promise<void> => {
  const result = await equipmentService.deleteEquipment(id);
  if (!result.success) throw new Error(result.error);
};

// ========== カテゴリ API ==========

// カテゴリ一覧取得
export const getCategories = async (): Promise<EquipmentCategory[]> => {
  const categories = await equipmentService.getCategories();
  return categories.map(toCategory);
};

// カテゴリ作成
export const createCategory = async (data: CategoryInput): Promise<EquipmentCategory> => {
  const result = await equipmentService.createCategory(data);
  if (!result.success) throw new Error(result.error);
  return toCategory(result.category!);
};

// カテゴリ更新
export const updateCategory = async (id: number, data: CategoryInput): Promise<EquipmentCategory> => {
  const result = await equipmentService.updateCategory(id, data);
  if (!result.success) throw new Error(result.error);
  const categories = await equipmentService.getCategories();
  const category = categories.find(c => c.id === id);
  if (!category) throw new Error('カテゴリが見つかりません');
  return toCategory(category);
};

// カテゴリ削除
export const deleteCategory = async (id: number): Promise<void> => {
  const result = await equipmentService.deleteCategory(id);
  if (!result.success) throw new Error(result.error);
};
