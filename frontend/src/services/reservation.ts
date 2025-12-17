import { db } from '../db';
import type { Reservation, ReservationStatus, ReservationWithRelations } from '../db/models';

// 予約一覧取得
export async function getReservations(options?: {
  userId?: number;
  equipmentId?: number;
  status?: ReservationStatus | ReservationStatus[];
  startDate?: Date;
  endDate?: Date;
}): Promise<ReservationWithRelations[]> {
  let reservations = await db.reservations.toArray();
  
  // フィルタリング
  if (options?.userId) {
    reservations = reservations.filter(r => r.userId === options.userId);
  }
  
  if (options?.equipmentId) {
    reservations = reservations.filter(r => r.equipmentId === options.equipmentId);
  }
  
  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    reservations = reservations.filter(r => statuses.includes(r.status));
  }
  
  if (options?.startDate) {
    reservations = reservations.filter(r => new Date(r.startTime) >= options.startDate!);
  }
  
  if (options?.endDate) {
    reservations = reservations.filter(r => new Date(r.endTime) <= options.endDate!);
  }
  
  // リレーション情報を付加
  const result: ReservationWithRelations[] = [];
  for (const reservation of reservations) {
    const user = reservation.userId ? await db.users.get(reservation.userId) : undefined;
    const equipment = reservation.equipmentId ? await db.equipment.get(reservation.equipmentId) : undefined;
    
    result.push({
      ...reservation,
      user: user ? { ...user, password: '' } : undefined,
      equipment: equipment ?? undefined
    });
  }
  
  // 開始日時でソート（新しい順）
  result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return result;
}

// 予約詳細取得
export async function getReservation(id: number): Promise<ReservationWithRelations | null> {
  const reservation = await db.reservations.get(id);
  if (!reservation) return null;
  
  const user = reservation.userId ? await db.users.get(reservation.userId) : undefined;
  const equipment = reservation.equipmentId ? await db.equipment.get(reservation.equipmentId) : undefined;
  
  return {
    ...reservation,
    user: user ? { ...user, password: '' } : undefined,
    equipment: equipment ?? undefined
  };
}

// 予約作成
export async function createReservation(data: {
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
  notes?: string;
}): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
  // 在庫チェック（無制限でない場合）
  if (data.equipmentId) {
    const equipment = await db.equipment.get(data.equipmentId);
    if (!equipment) {
      return { success: false, error: '資機材が見つかりません' };
    }
    
    if (!equipment.isUnlimited) {
      // 同じ時間帯の予約数をチェック
      const overlappingReservations = await db.reservations
        .filter(r => 
          r.equipmentId === data.equipmentId &&
          r.status !== 'cancelled' &&
          r.status !== 'rejected' &&
          new Date(r.startTime) < data.endTime &&
          new Date(r.endTime) > data.startTime
        )
        .toArray();
      
      const reservedQuantity = overlappingReservations.reduce((sum, r) => sum + r.quantity, 0);
      if (reservedQuantity + data.quantity > equipment.quantity) {
        return { success: false, error: '在庫が不足しています' };
      }
    }
  }
  
  const now = new Date();
  
  try {
    const id = await db.reservations.add({
      userId: data.userId,
      equipmentId: data.equipmentId,
      customEquipmentName: data.customEquipmentName,
      department: data.department,
      applicantName: data.applicantName,
      contactInfo: data.contactInfo,
      startTime: data.startTime,
      endTime: data.endTime,
      quantity: data.quantity,
      purpose: data.purpose,
      location: data.location,
      status: 'pending',
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    });
    
    const reservation = await db.reservations.get(id);
    return { success: true, reservation: reservation! };
  } catch (error) {
    return { success: false, error: '予約の作成に失敗しました' };
  }
}

// 予約更新
export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const reservation = await db.reservations.get(id);
  if (!reservation) {
    return { success: false, error: '予約が見つかりません' };
  }
  
  await db.reservations.update(id, { ...data, updatedAt: new Date() });
  return { success: true };
}

// 予約承認
export async function approveReservation(id: number): Promise<{ success: boolean; error?: string }> {
  return updateReservation(id, { status: 'approved' });
}

// 予約却下
export async function rejectReservation(id: number, notes?: string): Promise<{ success: boolean; error?: string }> {
  const updateData: Partial<Reservation> = { status: 'rejected' };
  if (notes) {
    updateData.notes = notes;
  }
  return updateReservation(id, updateData);
}

// 予約キャンセル
export async function cancelReservation(id: number): Promise<{ success: boolean; error?: string }> {
  return updateReservation(id, { status: 'cancelled' });
}

// 予約完了
export async function completeReservation(id: number): Promise<{ success: boolean; error?: string }> {
  return updateReservation(id, { status: 'completed' });
}

// 予約削除
export async function deleteReservation(id: number): Promise<{ success: boolean; error?: string }> {
  const reservation = await db.reservations.get(id);
  if (!reservation) {
    return { success: false, error: '予約が見つかりません' };
  }
  
  await db.reservations.delete(id);
  return { success: true };
}

// 資機材の空き状況確認
export async function checkAvailability(
  equipmentId: number,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: number
): Promise<{ available: boolean; availableQuantity: number }> {
  const equipment = await db.equipment.get(equipmentId);
  if (!equipment) {
    return { available: false, availableQuantity: 0 };
  }
  
  if (equipment.isUnlimited) {
    return { available: true, availableQuantity: Infinity };
  }
  
  const overlappingReservations = await db.reservations
    .filter(r => 
      r.equipmentId === equipmentId &&
      r.id !== excludeReservationId &&
      r.status !== 'cancelled' &&
      r.status !== 'rejected' &&
      new Date(r.startTime) < endTime &&
      new Date(r.endTime) > startTime
    )
    .toArray();
  
  const reservedQuantity = overlappingReservations.reduce((sum, r) => sum + r.quantity, 0);
  const availableQuantity = equipment.quantity - reservedQuantity;
  
  return {
    available: availableQuantity > 0,
    availableQuantity: Math.max(0, availableQuantity)
  };
}
