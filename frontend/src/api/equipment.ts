import { apiClient } from "./client";
import type {
  Equipment,
  EquipmentListResponse,
  EquipmentCategory,
  CategoryInput,
  EquipmentQueryParams,
} from "../types/equipment";

// ========== 資機材 API ==========

export { EquipmentQueryParams };

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

// 資機材一覧取得
export const getEquipmentList = async (
  params?: EquipmentQueryParams,
): Promise<EquipmentListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.categoryId) queryParams.append("categoryId", params.categoryId);
  if (params?.isActive !== undefined)
    queryParams.append("isActive", String(params.isActive));

  // ページネーションが必要ならここで追加（現状はデフォルト）
  // queryParams.append("page", "1");
  // queryParams.append("limit", "1000"); // 全件取得に近い形にする

  const response = await apiClient.get<EquipmentListResponse>(
    `/equipment?${queryParams.toString()}`,
  );
  return response.data;
};

// 資機材詳細取得
export const getEquipment = async (id: string): Promise<Equipment> => {
  const response = await apiClient.get<Equipment>(`/equipment/${id}`);
  return response.data;
};

// 資機材作成（Google Drive URL対応）
export const createEquipment = async (
  formData: FormData,
): Promise<Equipment> => {
  // バックエンドは multipart/form-data を受け付ける
  const response = await apiClient.post<Equipment>("/equipment", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 資機材更新（Google Drive URL対応）
export const updateEquipment = async (
  id: string,
  formData: FormData,
): Promise<Equipment> => {
  const response = await apiClient.put<Equipment>(
    `/equipment/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

// 資機材削除（論理削除）
export const deleteEquipment = async (id: string): Promise<void> => {
  await apiClient.delete(`/equipment/${id}`);
};

// ========== カテゴリ API ==========

// カテゴリ一覧取得
export const getCategories = async (): Promise<EquipmentCategory[]> => {
  const response = await apiClient.get<EquipmentCategory[]>(
    "/equipment/categories/list",
  );
  return response.data;
};

// カテゴリ作成
export const createCategory = async (
  data: CategoryInput,
): Promise<EquipmentCategory> => {
  const response = await apiClient.post<EquipmentCategory>(
    "/equipment/categories",
    data,
  );
  return response.data;
};

// カテゴリ更新
export const updateCategory = async (
  id: string,
  data: CategoryInput,
): Promise<EquipmentCategory> => {
  const response = await apiClient.put<EquipmentCategory>(
    `/equipment/categories/${id}`,
    data,
  );
  return response.data;
};

// カテゴリ削除
export const deleteCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/equipment/categories/${id}`);
};

// ========== ユーティリティ ==========

// ローカルパス形式のimageUrlをクリアする（バックエンドで実装すべきだが、現状APIがないため空実装）
export const clearLocalImageUrls = async (): Promise<{
  updated: number;
  skipped: number;
}> => {
  console.warn(
    "clearLocalImageUrls is not implemented in the new API client yet.",
  );
  return { updated: 0, skipped: 0 };
};
