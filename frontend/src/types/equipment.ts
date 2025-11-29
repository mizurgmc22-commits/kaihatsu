// 資機材カテゴリ
export interface EquipmentCategory {
  id: number;
  name: string;
  description?: string;
  equipmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

// 資機材
export interface Equipment {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  isActive: boolean;
  specifications?: Record<string, unknown>;
  category?: EquipmentCategory;
  createdAt: string;
  updatedAt: string;
}

// ページネーション
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 資機材一覧レスポンス
export interface EquipmentListResponse {
  items: Equipment[];
  pagination: Pagination;
}

// 資機材作成・更新リクエスト
export interface EquipmentInput {
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  categoryId?: number | null;
  specifications?: Record<string, unknown>;
  isActive?: boolean;
}

// カテゴリ作成・更新リクエスト
export interface CategoryInput {
  name: string;
  description?: string;
}
