// User types
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  firebase_uid: string | null;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Equipment types
export type EquipmentStatus = 'active' | 'inactive';

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Equipment {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  is_unlimited: boolean;
  location: string | null;
  image_file_id: string | null;
  status: EquipmentStatus;
  specs: Record<string, unknown>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EquipmentWithCategory extends Equipment {
  category?: EquipmentCategory;
  image_url?: string;
}

// Reservation types
export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface Reservation {
  id: string;
  user_id: string | null;
  equipment_id: string | null;
  custom_equipment_name: string | null;
  department: string;
  applicant_name: string;
  contact_info: string;
  start_time: Date;
  end_time: Date;
  quantity: number;
  purpose: string | null;
  location: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReservationWithRelations extends Reservation {
  equipment?: Equipment;
  user?: Omit<User, 'firebase_uid'>;
}

// File types
export interface FileRecord {
  id: string;
  gcs_path: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: Date;
}

// Audit log types
export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  user_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// API Request/Response types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Express extended types
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
    userId?: string;
  };
}
