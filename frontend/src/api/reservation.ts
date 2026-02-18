import { apiClient } from "./client";
import type {
  Reservation,
  ReservationInput,
  AvailableEquipment,
  CalendarData,
  ReservationListResponse,
  ReservationQueryParams,
  CalendarEvent,
  MyReservationParams,
} from "../types/reservation";
import { ReservationStatus } from "../types/reservation";

export {
  ReservationListResponse,
  ReservationQueryParams,
  CalendarEvent,
  MyReservationParams,
};

// 予約一覧取得
export const getReservations = async (
  params?: ReservationQueryParams,
): Promise<ReservationListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.equipmentId)
    queryParams.append("equipmentId", params.equipmentId);
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));

  const response = await apiClient.get<ReservationListResponse>(
    `/reservations?${queryParams.toString()}`,
  );
  return response.data;
};

// 予約詳細取得
export const getReservation = async (id: string): Promise<Reservation> => {
  const response = await apiClient.get<Reservation>(`/reservations/${id}`);
  return response.data;
};

// 特定日の予約可能機器一覧
export const getAvailableEquipment = async (
  date: string,
  categoryId?: string,
): Promise<AvailableEquipment[]> => {
  const queryParams = new URLSearchParams();
  queryParams.append("date", date);
  if (categoryId) queryParams.append("categoryId", categoryId);

  const response = await apiClient.get<AvailableEquipment[]>(
    `/reservations/available?${queryParams.toString()}`,
  );
  return response.data;
};

// 機器の月間予約状況取得
export const getEquipmentCalendar = async (
  equipmentId: string,
  year: number,
  month: number,
): Promise<CalendarData> => {
  const queryParams = new URLSearchParams();
  queryParams.append("year", String(year));
  queryParams.append("month", String(month));

  const response = await apiClient.get<CalendarData>(
    `/reservations/calendar/${equipmentId}?${queryParams.toString()}`,
  );
  return response.data;
};

// カレンダー表示用イベント取得
export const getCalendarEvents = async (
  start: string,
  end: string,
): Promise<CalendarEvent[]> => {
  const queryParams = new URLSearchParams();
  queryParams.append("start", start);
  queryParams.append("end", end);

  const response = await apiClient.get<CalendarEvent[]>(
    `/reservations/events?${queryParams.toString()}`,
  );
  return response.data;
};

// 予約作成
export const createReservation = async (
  data: ReservationInput,
): Promise<Reservation> => {
  const response = await apiClient.post<Reservation>("/reservations", data);
  return response.data;
};

// 予約更新
export const updateReservation = async (
  id: string,
  data: Partial<ReservationInput>,
): Promise<Reservation> => {
  const response = await apiClient.put<Reservation>(
    `/reservations/${id}`,
    data,
  );
  return response.data;
};

// 予約キャンセル（管理者用）
export const cancelReservation = async (id: string): Promise<void> => {
  await apiClient.delete(`/reservations/${id}`);
};

// ========== CSVエクスポート ==========
export const getExportUrl = (params?: any): string => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        queryParams.append(key, params[key]);
      }
    });
  }
  // apiClient.defaults.baseURL は /api なので、完全なURLを構築
  const baseUrl = apiClient.defaults.baseURL || "/api";
  return `${baseUrl}/reservations/admin/export?${queryParams.toString()}`;
};

// ========== ユーザー向け予約履歴 ==========

// 自分の予約履歴取得
export const getMyReservations = async (
  params: MyReservationParams,
): Promise<ReservationListResponse> => {
  const queryParams = new URLSearchParams();
  queryParams.append("contactInfo", params.contactInfo);
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));

  const response = await apiClient.get<ReservationListResponse>(
    `/reservations/my/history?${queryParams.toString()}`,
  );
  return response.data;
};

// ユーザーによる予約キャンセル
export const cancelMyReservation = async (
  id: string,
  contactInfo: string,
): Promise<{ message: string; reservation: Reservation }> => {
  const response = await apiClient.post<{
    message: string;
    reservation: Reservation;
  }>(`/reservations/my/cancel/${id}`, { contactInfo });
  return response.data;
};
