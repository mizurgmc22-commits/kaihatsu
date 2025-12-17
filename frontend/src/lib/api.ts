import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { getIdToken } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Equipment types
export interface Equipment {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  is_unlimited: boolean;
  location: string | null;
  image_file_id: string | null;
  status: 'active' | 'inactive';
  specs: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  category?: EquipmentCategory;
  image_url?: string;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
  start_time: string;
  end_time: string;
  quantity: number;
  purpose: string | null;
  location: string | null;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
}

export interface CreateReservationData {
  equipment_id?: string;
  custom_equipment_name?: string;
  department: string;
  applicant_name: string;
  contact_info: string;
  start_time: string;
  end_time: string;
  quantity: number;
  purpose?: string;
  location?: string;
  notes?: string;
}

// Equipment API
export const equipmentApi = {
  list: async (params?: { category_id?: string; include_inactive?: boolean }) => {
    const response = await api.get<ApiResponse<Equipment[]>>('/api/equipment', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<Equipment>>(`/api/equipment/${id}`);
    return response.data;
  },

  create: async (data: Partial<Equipment>) => {
    const response = await api.post<ApiResponse<Equipment>>('/api/equipment', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Equipment>) => {
    const response = await api.put<ApiResponse<Equipment>>(`/api/equipment/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/api/equipment/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get<ApiResponse<EquipmentCategory[]>>('/api/equipment/categories/list');
    return response.data;
  },

  createCategory: async (data: { name: string; description?: string; sort_order?: number }) => {
    const response = await api.post<ApiResponse<EquipmentCategory>>('/api/equipment/categories', data);
    return response.data;
  },
};

// Reservation API
export const reservationApi = {
  list: async (params?: {
    equipment_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<PaginatedResponse<Reservation>>('/api/reservations', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<Reservation>>(`/api/reservations/${id}`);
    return response.data;
  },

  create: async (data: CreateReservationData) => {
    const response = await api.post<ApiResponse<Reservation>>('/api/reservations', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Reservation>) => {
    const response = await api.put<ApiResponse<Reservation>>(`/api/reservations/${id}`, data);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post<ApiResponse<Reservation>>(`/api/reservations/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, notes?: string) => {
    const response = await api.post<ApiResponse<Reservation>>(`/api/reservations/${id}/reject`, { notes });
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/api/reservations/${id}`);
    return response.data;
  },

  checkAvailability: async (equipmentId: string, startTime: string, endTime: string) => {
    const response = await api.get<ApiResponse<{
      available: boolean;
      available_quantity: number;
      total_quantity?: number;
    }>>(`/api/reservations/availability/${equipmentId}`, {
      params: { start_time: startTime, end_time: endTime },
    });
    return response.data;
  },
};

// Admin API
export const adminApi = {
  getDashboard: async () => {
    const response = await api.get<ApiResponse<{
      counts: {
        pending_reservations: number;
        today_reservations: number;
        active_equipment: number;
        total_users: number;
      };
      recent_reservations: Reservation[];
      status_stats: Record<string, number>;
    }>>('/api/admin/dashboard');
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get<ApiResponse<Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      department: string | null;
      phone: string | null;
      is_active: boolean;
      created_at: string;
    }>>>('/api/admin/users');
    return response.data;
  },

  exportReservations: async (params?: { start_date?: string; end_date?: string; format?: 'json' | 'csv' }) => {
    const response = await api.get('/api/admin/export/reservations', { 
      params,
      responseType: params?.format === 'csv' ? 'blob' : 'json',
    });
    return response.data;
  },
};

// Auth API
export const authApi = {
  getMe: async () => {
    const response = await api.get<ApiResponse<{
      id?: string;
      uid: string;
      name: string;
      email: string;
      role: string;
      department?: string;
      phone?: string;
    }>>('/api/auth/me');
    return response.data;
  },
};

// File API
export const fileApi = {
  getUploadUrl: async (filename: string, contentType: string) => {
    const response = await api.post<ApiResponse<{
      file_id: string;
      upload_url: string;
      gcs_path: string;
    }>>('/api/files/upload-url', { filename, contentType });
    return response.data;
  },

  completeUpload: async (fileId: string, sizeBytes: number) => {
    const response = await api.post<ApiResponse>(`/api/files/${fileId}/complete`, { size_bytes: sizeBytes });
    return response.data;
  },

  getDownloadUrl: async (fileId: string) => {
    const response = await api.get<ApiResponse<{
      download_url: string;
    }>>(`/api/files/${fileId}/download-url`);
    return response.data;
  },

  delete: async (fileId: string) => {
    const response = await api.delete<ApiResponse>(`/api/files/${fileId}`);
    return response.data;
  },

  // Helper to upload a file using signed URL
  uploadFile: async (file: File) => {
    // Get signed URL
    const urlResponse = await fileApi.getUploadUrl(file.name, file.type);
    if (!urlResponse.success || !urlResponse.data) {
      throw new Error('Failed to get upload URL');
    }

    const { file_id, upload_url } = urlResponse.data;

    // Upload to GCS
    await axios.put(upload_url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });

    // Mark upload as complete
    await fileApi.completeUpload(file_id, file.size);

    return file_id;
  },
};

export default api;
