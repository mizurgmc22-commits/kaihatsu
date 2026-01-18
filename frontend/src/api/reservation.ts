import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import type {
  Reservation,
  ReservationInput,
  AvailableEquipment,
  CalendarData,
} from "../types/reservation";
import type { Pagination } from "../types/equipment";
import { ReservationStatus } from "../types/reservation";

export interface ReservationQueryParams {
  equipmentId?: string;
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

// ヘルパー: FirestoreドキュメントをReservation型に変換
const mapDocToReservation = (doc: any): Reservation => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Reservation;
};

// 予約一覧取得
export const getReservations = async (
  params?: ReservationQueryParams,
): Promise<ReservationListResponse> => {
  const reservationRef = collection(db, "reservations");
  let q = query(reservationRef, orderBy("startTime", "desc"));

  if (params?.equipmentId) {
    q = query(q, where("equipmentId", "==", params.equipmentId));
  }

  if (params?.status) {
    q = query(q, where("status", "==", params.status));
  }

  const querySnapshot = await getDocs(q);
  let items = querySnapshot.docs.map(mapDocToReservation);

  // クライアント側での日付フィルタ
  if (params?.startDate) {
    const start = new Date(params.startDate);
    items = items.filter((item) => new Date(item.startTime) >= start);
  }
  if (params?.endDate) {
    const end = new Date(params.endDate);
    items = items.filter((item) => new Date(item.endTime) <= end);
  }

  return {
    items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
};

// 予約詳細取得
export const getReservation = async (id: string): Promise<Reservation> => {
  const docRef = doc(db, "reservations", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Reservation not found");
  }
  return mapDocToReservation(docSnap);
};

// 特定日の予約可能機器一覧
export const getAvailableEquipment = async (
  date: string,
  categoryId?: string,
): Promise<AvailableEquipment[]> => {
  // 簡易実装: 全ての機器を取得し、その日の予約をチェック
  const equipmentRef = collection(db, "equipments");
  let eqQuery = query(
    equipmentRef,
    where("isDeleted", "==", false),
    where("isActive", "==", true),
  );
  if (categoryId) {
    eqQuery = query(eqQuery, where("categoryId", "==", categoryId));
  }

  const eqSnap = await getDocs(eqQuery);
  const equipments = eqSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as any,
  );

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

  const resRef = collection(db, "reservations");
  const resSnap = await getDocs(
    query(
      resRef,
      where("status", "in", [
        ReservationStatus.APPROVED,
        ReservationStatus.PENDING,
      ]),
    ),
  );
  const reservations = resSnap.docs.map((doc) => doc.data());

  return equipments.map((eq) => {
    const used = reservations
      .filter(
        (r) =>
          r.equipmentId === eq.id &&
          r.startTime <= endOfDay &&
          r.endTime >= startOfDay,
      )
      .reduce((sum, r) => sum + (r.quantity || 0), 0);

    return {
      ...eq,
      remainingQuantity: eq.quantity - used,
      isAvailable: eq.quantity - used > 0 || eq.isUnlimited,
      isUnlimited: eq.isUnlimited || false,
    };
  });
};

// 機器の月間予約状況取得
export const getEquipmentCalendar = async (
  equipmentId: string,
  year: number,
  month: number,
): Promise<CalendarData> => {
  const docRef = doc(db, "equipments", equipmentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Equipment not found");
  const equipment = docSnap.data();

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

  const resRef = collection(db, "reservations");
  const q = query(
    resRef,
    where("equipmentId", "==", equipmentId),
    where("status", "in", [
      ReservationStatus.APPROVED,
      ReservationStatus.PENDING,
    ]),
  );

  const resSnap = await getDocs(q);
  const reservations = resSnap.docs
    .map(mapDocToReservation)
    .filter((r) => r.startTime <= endOfMonth && r.endTime >= startOfMonth);

  // 日ごとの空き状況を計算
  const dailyAvailability: Record<string, any> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const dayRes = reservations.filter(
      (r) => r.startTime <= dayEnd && r.endTime >= dayStart,
    );
    const used = dayRes.reduce((sum, r) => sum + r.quantity, 0);

    dailyAvailability[dateStr] = {
      remaining: equipment.quantity - used,
      reservations: dayRes.map((r) => ({
        id: r.id,
        quantity: r.quantity,
        purpose: r.purpose,
        userName: r.applicantName,
        status: r.status,
      })),
    };
  }

  return {
    equipment: {
      id: equipmentId,
      name: equipment.name,
      totalQuantity: equipment.quantity,
    },
    dailyAvailability,
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

export const getCalendarEvents = async (
  start: string,
  end: string,
): Promise<CalendarEvent[]> => {
  const resRef = collection(db, "reservations");
  const querySnapshot = await getDocs(resRef);
  const reservations = querySnapshot.docs
    .map(mapDocToReservation)
    .filter((r) => r.startTime <= end && r.endTime >= start);

  // 機器情報を一括取得（キャッシュを検討すべきだが一旦）
  const eqSnap = await getDocs(collection(db, "equipments"));
  const eqMap = new Map(eqSnap.docs.map((doc) => [doc.id, doc.data().name]));

  return reservations.map((r) => ({
    id: r.id,
    title: `${eqMap.get(r.equipmentId || "") || r.customEquipmentName || "不明"} (${r.quantity})`,
    start: r.startTime,
    end: r.endTime,
    extendedProps: {
      equipmentName:
        eqMap.get(r.equipmentId || "") || r.customEquipmentName || "",
      department: r.department,
      applicantName: r.applicantName,
      quantity: r.quantity,
      status: r.status,
    },
    backgroundColor:
      r.status === ReservationStatus.APPROVED ? "#48BB78" : "#ECC94B",
    borderColor: "transparent",
  }));
};

// 予約作成
export const createReservation = async (
  data: ReservationInput,
): Promise<Reservation> => {
  const reservationData = {
    ...data,
    status: ReservationStatus.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "reservations"), reservationData);
  return { id: docRef.id, ...reservationData } as any;
};

// 予約更新
export const updateReservation = async (
  id: string,
  data: Partial<ReservationInput>,
): Promise<Reservation> => {
  const docRef = doc(db, "reservations", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const updatedDoc = await getDoc(docRef);
  return mapDocToReservation(updatedDoc);
};

// 予約キャンセル
export const cancelReservation = async (id: string): Promise<void> => {
  const docRef = doc(db, "reservations", id);
  await updateDoc(docRef, {
    status: ReservationStatus.CANCELLED,
    updatedAt: serverTimestamp(),
  });
};

// ========== CSVエクスポート ==========
// 注意: Client-sideでCSV生成するように変更するか、一旦URL生成を無効化
export const getExportUrl = (params?: any): string => {
  return "#"; // 一旦無効化
};

// ========== ユーザー向け予約履歴 ==========

export interface MyReservationParams {
  contactInfo: string;
  page?: number;
  limit?: number;
}

// 自分の予約履歴取得
export const getMyReservations = async (
  params: MyReservationParams,
): Promise<ReservationListResponse> => {
  const resRef = collection(db, "reservations");
  const q = query(
    resRef,
    where("contactInfo", "==", params.contactInfo),
    orderBy("startTime", "desc"),
  );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(mapDocToReservation);

  return {
    items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
};

// ユーザーによる予約キャンセル
export const cancelMyReservation = async (
  id: string,
  contactInfo: string,
): Promise<{ message: string; reservation: Reservation }> => {
  const res = await getReservation(id);
  if (res.contactInfo !== contactInfo) {
    throw new Error("許可されていない操作です");
  }

  const docRef = doc(db, "reservations", id);
  await updateDoc(docRef, {
    status: ReservationStatus.CANCELLED,
    updatedAt: serverTimestamp(),
  });

  const updatedRes = await getReservation(id);
  return { message: "キャンセルしました", reservation: updatedRes };
};
