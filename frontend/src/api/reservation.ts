import * as reservationService from '../services/reservation';
import * as equipmentService from '../services/equipment';
import type {
  Reservation,
  ReservationInput,
  AvailableEquipment,
  CalendarData,
  ReservationStatus
} from '../types/reservation';
import type { Pagination } from '../types/equipment';
import type { Reservation as DBReservation, ReservationWithRelations } from '../db/models';

// 型変換ヘルパー
const toReservation = (r: ReservationWithRelations | DBReservation): Reservation => ({
  id: r.id!,
  equipment: (r as ReservationWithRelations).equipment ? {
    id: (r as ReservationWithRelations).equipment!.id!,
    name: (r as ReservationWithRelations).equipment!.name,
    description: (r as ReservationWithRelations).equipment!.description,
    quantity: (r as ReservationWithRelations).equipment!.quantity,
    location: (r as ReservationWithRelations).equipment!.location,
    imageUrl: (r as ReservationWithRelations).equipment!.imageUrl,
    isActive: (r as ReservationWithRelations).equipment!.isActive,
    createdAt: (r as ReservationWithRelations).equipment!.createdAt.toISOString(),
    updatedAt: (r as ReservationWithRelations).equipment!.updatedAt.toISOString()
  } : null,
  customEquipmentName: r.customEquipmentName,
  user: (r as ReservationWithRelations).user ? {
    id: (r as ReservationWithRelations).user!.id!,
    name: (r as ReservationWithRelations).user!.name,
    email: (r as ReservationWithRelations).user!.email,
    department: (r as ReservationWithRelations).user!.department
  } : undefined,
  department: r.department,
  applicantName: r.applicantName,
  contactInfo: r.contactInfo,
  startTime: r.startTime instanceof Date ? r.startTime.toISOString() : r.startTime as string,
  endTime: r.endTime instanceof Date ? r.endTime.toISOString() : r.endTime as string,
  quantity: r.quantity,
  purpose: r.purpose,
  location: r.location,
  status: r.status as ReservationStatus,
  notes: r.notes,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt as string,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt as string
});

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
  const list = await reservationService.getReservations({
    equipmentId: params?.equipmentId,
    status: params?.status as any,
    startDate: params?.startDate ? new Date(params.startDate) : undefined,
    endDate: params?.endDate ? new Date(params.endDate) : undefined
  });
  
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const start = (page - 1) * limit;
  const items = list.slice(start, start + limit);
  
  return {
    items: items.map(toReservation),
    pagination: {
      page,
      limit,
      total: list.length,
      totalPages: Math.ceil(list.length / limit)
    }
  };
};

// 予約詳細取得
export const getReservation = async (id: number): Promise<Reservation> => {
  const reservation = await reservationService.getReservation(id);
  if (!reservation) throw new Error('予約が見つかりません');
  return toReservation(reservation);
};

// 特定日の予約可能機器一覧
export const getAvailableEquipment = async (date: string, categoryId?: number): Promise<AvailableEquipment[]> => {
  const equipmentList = await equipmentService.getEquipmentList({
    categoryId,
    includeInactive: false
  });
  
  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  
  const result: AvailableEquipment[] = [];
  
  for (const equipment of equipmentList) {
    const availability = await reservationService.checkAvailability(
      equipment.id!,
      startOfDay,
      endOfDay
    );
    
    result.push({
      id: equipment.id!,
      name: equipment.name,
      description: equipment.description,
      quantity: equipment.quantity,
      location: equipment.location,
      imageUrl: equipment.imageData || equipment.imageUrl,
      isActive: equipment.isActive,
      category: equipment.category ? {
        id: equipment.category.id!,
        name: equipment.category.name,
        description: equipment.category.description,
        createdAt: equipment.category.createdAt.toISOString(),
        updatedAt: equipment.category.updatedAt.toISOString()
      } : undefined,
      createdAt: equipment.createdAt.toISOString(),
      updatedAt: equipment.updatedAt.toISOString(),
      remainingQuantity: availability.availableQuantity === Infinity ? equipment.quantity : availability.availableQuantity,
      isAvailable: availability.available,
      isUnlimited: equipment.isUnlimited
    });
  }
  
  return result;
};

// 機器の月間予約状況取得
export const getEquipmentCalendar = async (equipmentId: number, year: number, month: number): Promise<CalendarData> => {
  const equipment = await equipmentService.getEquipment(equipmentId);
  if (!equipment) throw new Error('資機材が見つかりません');
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const reservations = await reservationService.getReservations({
    equipmentId,
    startDate,
    endDate
  });
  
  const dailyAvailability: Record<string, { remaining: number; reservations: any[] }> = {};
  
  // 月の各日について計算
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayStart = new Date(year, month - 1, day, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
    
    const dayReservations = reservations.filter(r => {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      return start <= dayEnd && end >= dayStart && r.status !== 'cancelled' && r.status !== 'rejected';
    });
    
    const reservedQty = dayReservations.reduce((sum, r) => sum + r.quantity, 0);
    
    dailyAvailability[dateStr] = {
      remaining: equipment.isUnlimited ? equipment.quantity : equipment.quantity - reservedQty,
      reservations: dayReservations.map(r => ({
        id: r.id,
        quantity: r.quantity,
        purpose: r.purpose,
        userName: r.applicantName,
        status: r.status
      }))
    };
  }
  
  return {
    equipment: {
      id: equipment.id!,
      name: equipment.name,
      totalQuantity: equipment.quantity
    },
    dailyAvailability
  };
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

const statusColors: Record<string, { bg: string; border: string }> = {
  pending: { bg: '#FFA500', border: '#CC8400' },
  approved: { bg: '#48BB78', border: '#38A169' },
  rejected: { bg: '#F56565', border: '#E53E3E' },
  cancelled: { bg: '#A0AEC0', border: '#718096' },
  completed: { bg: '#4299E1', border: '#3182CE' }
};

export const getCalendarEvents = async (start: string, end: string): Promise<CalendarEvent[]> => {
  const reservations = await reservationService.getReservations({
    startDate: new Date(start),
    endDate: new Date(end)
  });
  
  return reservations.map(r => {
    const colors = statusColors[r.status] || statusColors.pending;
    const equipmentName = r.equipment?.name || r.customEquipmentName || '不明';
    
    return {
      id: String(r.id),
      title: `${equipmentName} (${r.applicantName})`,
      start: r.startTime instanceof Date ? r.startTime.toISOString() : r.startTime,
      end: r.endTime instanceof Date ? r.endTime.toISOString() : r.endTime,
      extendedProps: {
        equipmentName,
        department: r.department,
        applicantName: r.applicantName,
        quantity: r.quantity,
        status: r.status
      },
      backgroundColor: colors.bg,
      borderColor: colors.border
    };
  });
};

// 予約作成
export const createReservation = async (data: ReservationInput): Promise<Reservation> => {
  const result = await reservationService.createReservation({
    equipmentId: data.equipmentId,
    customEquipmentName: data.customEquipmentName,
    department: data.department,
    applicantName: data.applicantName,
    contactInfo: data.contactInfo,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    quantity: data.quantity || 1,
    purpose: data.purpose,
    location: data.location,
    notes: data.notes
  });
  
  if (!result.success) throw new Error(result.error);
  
  const reservation = await reservationService.getReservation(result.reservation!.id!);
  return toReservation(reservation!);
};

// 予約更新
export const updateReservation = async (id: number, data: Partial<ReservationInput>): Promise<Reservation> => {
  const updateData: any = {};
  if (data.startTime) updateData.startTime = new Date(data.startTime);
  if (data.endTime) updateData.endTime = new Date(data.endTime);
  if (data.quantity) updateData.quantity = data.quantity;
  if (data.purpose !== undefined) updateData.purpose = data.purpose;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.notes !== undefined) updateData.notes = data.notes;
  
  const result = await reservationService.updateReservation(id, updateData);
  if (!result.success) throw new Error(result.error);
  
  const reservation = await reservationService.getReservation(id);
  return toReservation(reservation!);
};

// 予約キャンセル
export const cancelReservation = async (id: number): Promise<void> => {
  const result = await reservationService.cancelReservation(id);
  if (!result.success) throw new Error(result.error);
};

// ========== CSVエクスポート ==========

export interface ExportParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  equipmentId?: number;
  department?: string;
}

// CSVエクスポート（ローカル生成）
export const exportReservationsCSV = async (params?: ExportParams): Promise<string> => {
  const reservations = await reservationService.getReservations({
    status: params?.status as any,
    startDate: params?.startDate ? new Date(params.startDate) : undefined,
    endDate: params?.endDate ? new Date(params.endDate) : undefined,
    equipmentId: params?.equipmentId
  });
  
  let filtered = reservations;
  if (params?.department) {
    filtered = reservations.filter(r => r.department === params.department);
  }
  
  const headers = ['ID', '資機材名', '部署', '申請者', '連絡先', '開始日時', '終了日時', '数量', '目的', 'ステータス'];
  const rows = filtered.map(r => [
    r.id,
    r.equipment?.name || r.customEquipmentName || '',
    r.department,
    r.applicantName,
    r.contactInfo,
    r.startTime instanceof Date ? r.startTime.toISOString() : r.startTime,
    r.endTime instanceof Date ? r.endTime.toISOString() : r.endTime,
    r.quantity,
    r.purpose || '',
    r.status
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

// CSVエクスポートURL生成（互換性のため残す）
export const getExportUrl = (_params?: ExportParams): string => {
  console.warn('getExportUrl is deprecated. Use exportReservationsCSV instead.');
  return '';
};

// ========== ユーザー向け予約履歴 ==========

export interface MyReservationParams {
  contactInfo: string;
  page?: number;
  limit?: number;
}

// 自分の予約履歴取得
export const getMyReservations = async (params: MyReservationParams): Promise<ReservationListResponse> => {
  const allReservations = await reservationService.getReservations();
  const filtered = allReservations.filter(r => r.contactInfo === params.contactInfo);
  
  const page = params.page || 1;
  const limit = params.limit || 20;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  
  return {
    items: items.map(toReservation),
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit)
    }
  };
};

// ユーザーによる予約キャンセル
export const cancelMyReservation = async (id: number, contactInfo: string): Promise<{ message: string; reservation: Reservation }> => {
  const reservation = await reservationService.getReservation(id);
  if (!reservation) throw new Error('予約が見つかりません');
  if (reservation.contactInfo !== contactInfo) throw new Error('この予約をキャンセルする権限がありません');
  
  const result = await reservationService.cancelReservation(id);
  if (!result.success) throw new Error(result.error);
  
  const updated = await reservationService.getReservation(id);
  return {
    message: '予約をキャンセルしました',
    reservation: toReservation(updated!)
  };
};
