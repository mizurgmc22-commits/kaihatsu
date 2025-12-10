import { apiClient } from './client';
import type {
  Reservation,
  ReservationInput,
  AvailableEquipment,
  CalendarData
} from '../types/reservation';
import type { Pagination } from '../types/equipment';

export interface ReservationQueryParams {
  equipmentId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ReservationListResponse {
  items: Reservation[];
  pagination: Pagination;
}

// 予約一覧取得
export const getReservations = async (params?: ReservationQueryParams): Promise<ReservationListResponse> => {
  const response = await apiClient.get<ReservationListResponse>('/reservations', { params });
  return response.data;
};

// 予約詳細取得
export const getReservation = async (id: number): Promise<Reservation> => {
  const response = await apiClient.get<Reservation>(`/reservations/${id}`);
  return response.data;
};

// 特定日の予約可能機器一覧
export const getAvailableEquipment = async (date: string, categoryId?: number): Promise<AvailableEquipment[]> => {
  const params: Record<string, string | number> = { date };
  if (categoryId) params.categoryId = categoryId;
  const response = await apiClient.get<AvailableEquipment[]>('/reservations/available', { params });
  return response.data;
};

// 機器の月間予約状況取得
export const getEquipmentCalendar = async (equipmentId: number, year: number, month: number): Promise<CalendarData> => {
  const response = await apiClient.get<CalendarData>(`/reservations/calendar/${equipmentId}`, {
    params: { year, month }
  });
  return response.data;
};

// カレンダー表示用イベント取得
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    equipmentName: string;
    department: string;
    applicantName: string;
    quantity: number;
    status: string;
  };
  backgroundColor: string;
  borderColor: string;
}

export const getCalendarEvents = async (start: string, end: string): Promise<CalendarEvent[]> => {
  const response = await apiClient.get<CalendarEvent[]>('/reservations/events', {
    params: { start, end }
  });
  return response.data;
};

// 予約作成
export const createReservation = async (data: ReservationInput): Promise<Reservation> => {
  const response = await apiClient.post<Reservation>('/reservations', data);
  return response.data;
};

// 予約更新
export const updateReservation = async (id: number, data: Partial<ReservationInput>): Promise<Reservation> => {
  const response = await apiClient.put<Reservation>(`/reservations/${id}`, data);
  return response.data;
};

// 予約キャンセル
export const cancelReservation = async (id: number): Promise<void> => {
  await apiClient.delete(`/reservations/${id}`);
};

// ========== CSVエクスポート ==========

export interface ExportParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  equipmentId?: number;
  department?: string;
}

// CSVエクスポートURL生成
export const getExportUrl = (params?: ExportParams): string => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.equipmentId) searchParams.append('equipmentId', String(params.equipmentId));
  if (params?.department) searchParams.append('department', params.department);
  
  const queryString = searchParams.toString();
  return `/api/reservations/admin/export${queryString ? `?${queryString}` : ''}`;
};

// ========== ユーザー向け予約履歴 ==========

export interface MyReservationParams {
  contactInfo: string;
  page?: number;
  limit?: number;
}

// 自分の予約履歴取得
export const getMyReservations = async (params: MyReservationParams): Promise<ReservationListResponse> => {
  const response = await apiClient.get<ReservationListResponse>('/reservations/my/history', { params });
  return response.data;
};

// ユーザーによる予約キャンセル
export const cancelMyReservation = async (id: number, contactInfo: string): Promise<{ message: string; reservation: Reservation }> => {
  const response = await apiClient.post<{ message: string; reservation: Reservation }>(`/reservations/my/cancel/${id}`, { contactInfo });
  return response.data;
};
