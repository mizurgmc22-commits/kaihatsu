import { apiClient } from './client';
import type {
  Equipment,
  EquipmentListResponse,
  EquipmentCategory,
  CategoryInput
} from '../types/equipment';

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
  const response = await apiClient.get<EquipmentListResponse>('/equipment', { params });
  return response.data;
};

// 資機材詳細取得
export const getEquipment = async (id: number): Promise<Equipment> => {
  const response = await apiClient.get<Equipment>(`/equipment/${id}`);
  return response.data;
};

// 資機材作成
export const createEquipment = async (data: FormData): Promise<Equipment> => {
  const response = await apiClient.post<Equipment>('/equipment', data);
  return response.data;
};

// 資機材更新
export const updateEquipment = async (id: number, data: FormData): Promise<Equipment> => {
  const response = await apiClient.put<Equipment>(`/equipment/${id}`, data);
  return response.data;
};

// 資機材削除（論理削除）
export const deleteEquipment = async (id: number): Promise<void> => {
  await apiClient.delete(`/equipment/${id}`);
};

// ========== カテゴリ API ==========

// カテゴリ一覧取得
export const getCategories = async (): Promise<EquipmentCategory[]> => {
  const response = await apiClient.get<EquipmentCategory[]>('/equipment/categories/list');
  return response.data;
};

// カテゴリ作成
export const createCategory = async (data: CategoryInput): Promise<EquipmentCategory> => {
  const response = await apiClient.post<EquipmentCategory>('/equipment/categories', data);
  return response.data;
};

// カテゴリ更新
export const updateCategory = async (id: number, data: CategoryInput): Promise<EquipmentCategory> => {
  const response = await apiClient.put<EquipmentCategory>(`/equipment/categories/${id}`, data);
  return response.data;
};

// カテゴリ削除
export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`/equipment/categories/${id}`);
};
