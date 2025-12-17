// ユーザーロール
export type UserRole = 'user' | 'admin' | 'system_admin';

// ユーザー
export interface User {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phoneNumber?: string;
  extensionNumber?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// 資機材カテゴリ
export interface EquipmentCategory {
  id?: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 資機材
export interface Equipment {
  id?: number;
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  imageUrl?: string;
  imageData?: string; // Base64エンコードされた画像データ
  isActive: boolean;
  isUnlimited: boolean;
  isDeleted: boolean;
  specifications?: Record<string, unknown>;
  categoryId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 予約ステータス
export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

// 予約
export interface Reservation {
  id?: number;
  userId?: number;
  equipmentId?: number;
  customEquipmentName?: string;
  department: string;
  applicantName: string;
  contactInfo: string;
  startTime: Date;
  endTime: Date;
  quantity: number;
  purpose?: string;
  location?: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API用のレスポンス型（リレーション含む）
export interface ReservationWithRelations extends Reservation {
  user?: User;
  equipment?: Equipment;
}

export interface EquipmentWithCategory extends Equipment {
  category?: EquipmentCategory;
}
