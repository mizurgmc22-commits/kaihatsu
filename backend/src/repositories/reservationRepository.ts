import admin from "firebase-admin";
import { db } from "../lib/firebase";

const reservationCollection = () => db.collection("reservations");

const Timestamp = admin.firestore.Timestamp;

export interface ReservationData {
  id?: string;
  equipmentId?: string;
  customEquipmentName?: string;
  department: string;
  applicantName: string;
  contactInfo: string;
  startTime: admin.firestore.Timestamp | Date;
  endTime: admin.firestore.Timestamp | Date;
  quantity: number;
  purpose?: string;
  location?: string;
  status: string;
  notes?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

function toDate(
  value: admin.firestore.Timestamp | Date | string | undefined
): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (value && typeof (value as any).toDate === "function")
    return (value as admin.firestore.Timestamp).toDate();
  return undefined;
}

function docToReservation(
  doc: admin.firestore.DocumentSnapshot
): ReservationData & { id: string } {
  const data = doc.data()!;
  return {
    id: doc.id,
    equipmentId: data.equipmentId || undefined,
    customEquipmentName: data.customEquipmentName || undefined,
    department: data.department || "",
    applicantName: data.applicantName || "",
    contactInfo: data.contactInfo || "",
    startTime: data.startTime,
    endTime: data.endTime,
    quantity: data.quantity ?? 1,
    purpose: data.purpose || undefined,
    location: data.location || undefined,
    status: data.status || "pending",
    notes: data.notes || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ---------- 予約一覧取得 ----------

export async function findAllReservations(options?: {
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  contactInfo?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: (ReservationData & { id: string })[];
  total: number;
}> {
  // 複合インデックスを避けるため全件取得し、アプリケーション側でフィルタ
  const snapshot = await reservationCollection().get();
  let items = snapshot.docs.map(docToReservation);

  if (options?.equipmentId) {
    items = items.filter((item) => item.equipmentId === options.equipmentId);
  }

  if (options?.status) {
    items = items.filter((item) => item.status === options.status);
  }

  if (options?.contactInfo) {
    items = items.filter((item) => item.contactInfo === options.contactInfo);
  }

  // 日付範囲フィルタ
  if (options?.startDate) {
    const startDate = new Date(options.startDate);
    items = items.filter((item) => {
      const itemStart = toDate(item.startTime);
      return itemStart ? itemStart >= startDate : false;
    });
  }
  if (options?.endDate) {
    const endDate = new Date(options.endDate);
    items = items.filter((item) => {
      const itemStart = toDate(item.startTime);
      return itemStart ? itemStart <= endDate : false;
    });
  }

  // startTime降順でソート
  items.sort((a, b) => {
    const aDate = toDate(a.startTime);
    const bDate = toDate(b.startTime);
    if (!aDate || !bDate) return 0;
    return bDate.getTime() - aDate.getTime();
  });

  const total = items.length;

  // ページネーション
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;
  items = items.slice(skip, skip + limit);

  return { items, total };
}

// ---------- 予約詳細取得 ----------

export async function findReservationById(
  id: string
): Promise<(ReservationData & { id: string }) | null> {
  const doc = await reservationCollection().doc(id).get();
  if (!doc.exists) return null;
  return docToReservation(doc);
}

// ---------- 予約イベント一覧（カレンダー用） ----------

export async function findReservationEvents(
  start: string,
  end: string
): Promise<(ReservationData & { id: string })[]> {
  const startDate = Timestamp.fromDate(new Date(start));
  const endDate = Timestamp.fromDate(new Date(end));

  const snapshot = await reservationCollection()
    .where("startTime", ">=", startDate)
    .where("startTime", "<=", endDate)
    .orderBy("startTime", "asc")
    .get();

  return snapshot.docs.map(docToReservation);
}

// ---------- 指定日の予約済み数量取得 ----------

export async function getReservedQuantity(
  equipmentId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string
): Promise<number> {
  // 複合インデックスを避けるため全件取得し、アプリケーション側でフィルタ
  const snapshot = await reservationCollection().get();

  let totalReserved = 0;
  for (const doc of snapshot.docs) {
    if (excludeReservationId && doc.id === excludeReservationId) continue;
    const data = doc.data();
    if (data.equipmentId !== equipmentId) continue;
    if (!["pending", "approved"].includes(data.status)) continue;
    const rStart = toDate(data.startTime);
    const rEnd = toDate(data.endTime);
    if (!rStart || !rEnd) continue;

    // 時間帯が重複しているかチェック
    if (rStart < endTime && rEnd > startTime) {
      totalReserved += data.quantity ?? 1;
    }
  }

  return totalReserved;
}

// ---------- 特定日の予約一覧（機材別） ----------

export async function findReservationsForEquipmentInRange(
  equipmentId: string,
  startTime: Date,
  endTime: Date
): Promise<(ReservationData & { id: string })[]> {
  // 複合インデックスを避けるため全件取得し、アプリケーション側でフィルタ
  const snapshot = await reservationCollection().get();

  return snapshot.docs
    .map(docToReservation)
    .filter((r) => {
      if (r.equipmentId !== equipmentId) return false;
      if (!["pending", "approved"].includes(r.status)) return false;
      const rStart = toDate(r.startTime);
      const rEnd = toDate(r.endTime);
      if (!rStart || !rEnd) return false;
      return rStart < endTime && rEnd > startTime;
    });
}

// ---------- 予約作成 ----------

export async function createReservation(
  data: Omit<ReservationData, "id" | "createdAt" | "updatedAt">
): Promise<ReservationData & { id: string }> {
  const now = Timestamp.now();
  const startTimestamp =
    data.startTime instanceof Date
      ? Timestamp.fromDate(data.startTime)
      : data.startTime;
  const endTimestamp =
    data.endTime instanceof Date
      ? Timestamp.fromDate(data.endTime)
      : data.endTime;

  const docRef = await reservationCollection().add({
    ...data,
    startTime: startTimestamp,
    endTime: endTimestamp,
    status: data.status || "pending",
    quantity: data.quantity ?? 1,
    createdAt: now,
    updatedAt: now,
  });
  const created = await docRef.get();
  return docToReservation(created);
}

// ---------- 予約更新 ----------

export async function updateReservation(
  id: string,
  data: Partial<ReservationData>
): Promise<(ReservationData & { id: string }) | null> {
  const docRef = reservationCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  // Timestampに変換
  if (data.startTime && data.startTime instanceof Date) {
    updateData.startTime = Timestamp.fromDate(data.startTime);
  }
  if (data.endTime && data.endTime instanceof Date) {
    updateData.endTime = Timestamp.fromDate(data.endTime);
  }

  delete updateData.id;
  delete updateData.createdAt;

  await docRef.update(updateData);
  return findReservationById(id);
}

// ---------- 予約削除 ----------

export async function deleteReservation(id: string): Promise<boolean> {
  const docRef = reservationCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return false;
  await docRef.delete();
  return true;
}

// ---------- ヘルパー ----------

export { toDate };
