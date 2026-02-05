import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import type {
  Reservation,
  ReservationInput,
  AvailableEquipment,
  CalendarData,
} from "../types/reservation";
import type { Pagination, Equipment } from "../types/equipment";
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
const mapDocToReservation = (doc: QueryDocumentSnapshot<DocumentData> | import("firebase/firestore").DocumentSnapshot<DocumentData>): Reservation => {
  const data = doc.data();
  if (!data) {
    throw new Error("Document data is undefined");
  }
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

  // Note: 複合インデックスが必要になる可能性があるため、日付フィルタはクライアント側で実施
  // Firestoreの制約上、等価フィルタと範囲フィルタの組み合わせには注意が必要

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
  // 並行してデータ取得を行いパフォーマンスを向上
  const equipmentPromise = (async () => {
    const equipmentRef = collection(db, "equipments");
    let eqQuery = query(
      equipmentRef,
      where("isDeleted", "==", false),
      where("isActive", "==", true),
    );
    if (categoryId) {
      eqQuery = query(eqQuery, where("categoryId", "==", categoryId));
    }
    const snap = await getDocs(eqQuery);
    // any型を排除し、Equipment型として扱う（ただしFirestoreのデータは保証されないためキャストは必要）
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Equipment);
  })();

  const categoriesPromise = (async () => {
    const categoryRef = collection(db, "categories");
    const snap = await getDocs(categoryRef);
    return new Map(
      snap.docs.map((doc) => {
        const d = doc.data();
        return [
          doc.id,
          {
            id: doc.id,
            name: d.name as string,
            description: d.description as string,
            createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: d.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          },
        ];
      }),
    );
  })();

  const reservationsPromise = (async () => {
    const resRef = collection(db, "reservations");
    // statusでのフィルタリングのみFirestoreで行う
    // 日付範囲フィルタは複合インデックスが必要なため、現状はクライアント側で実施
    // 将来的には where("endTime", ">=", startOfDay) などを検討すべき
    const snap = await getDocs(
      query(
        resRef,
        where("status", "in", [
          ReservationStatus.APPROVED,
          ReservationStatus.PENDING,
        ]),
      ),
    );
    return snap.docs.map((doc) => doc.data() as Reservation);
  })();

  const [equipments, categoryMap, allReservations] = await Promise.all([
    equipmentPromise,
    categoriesPromise,
    reservationsPromise,
  ]);

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

  // 対象日の予約のみをメモリ上でフィルタリング
  const todaysReservations = allReservations.filter(
    (r) => r.startTime <= endOfDay && r.endTime >= startOfDay
  );

  return equipments.map((eq) => {
    const used = todaysReservations
      .filter((r) => r.equipmentId === eq.id)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);

    // カテゴリ情報を付与
    // Equipment型にはcategoryIdがあるはずだが、型定義によってはcategoryオブジェクトの場合もある
    // ここでは安全に map から取得したオブジェクトを使用する
    // データ構造の不整合（categoryIdフィールド vs categoryオブジェクト）を吸収
    const resolvedCategory = eq.category?.id && categoryMap.has(eq.category.id)
      ? categoryMap.get(eq.category.id)
      : (eq as any).categoryId && categoryMap.has((eq as any).categoryId)
        ? categoryMap.get((eq as any).categoryId)
        : undefined;


    return {
      ...eq,
      category: resolvedCategory,
      remainingQuantity: eq.quantity - used,
      isAvailable: eq.quantity - used > 0 || !!(eq as any).isUnlimited, // isUnlimitedの型定義がない場合への対処
      isUnlimited: !!(eq as any).isUnlimited,
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
  const equipment = docSnap.data() as Equipment;

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
  return { id: docRef.id, ...reservationData } as unknown as Reservation;
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
  // 複合インデックスを避けるため、単一フィールドクエリを使用
  const q = query(
    resRef,
    where("contactInfo", "==", params.contactInfo),
  );
  const querySnapshot = await getDocs(q);
  // クライアント側でソート（最新順）
  const now = new Date().toISOString();
  let items = querySnapshot.docs
    .map(mapDocToReservation)
    // 借用期間（返却日）が過ぎたものを除外（要件次第だが現状のロジックを維持）
    .filter((item) => item.endTime >= now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // 機材情報を取得して紐づける
  const eqSnap = await getDocs(collection(db, "equipments"));
  const eqMap = new Map(
    eqSnap.docs.map((doc) => {
      const d = doc.data();
      return [doc.id, { id: doc.id, name: d.name, categoryId: d.categoryId }];
    })
  );

  // カテゴリ情報を取得
  const categorySnap = await getDocs(collection(db, "categories"));
  const categoryMap = new Map(
    categorySnap.docs.map((doc) => [doc.id, { id: doc.id, name: doc.data().name }])
  );

  // 予約に機材情報を紐づけ
  items = items.map((item) => {
    const equipment = item.equipmentId ? eqMap.get(item.equipmentId) : undefined;
    const category = equipment?.categoryId ? categoryMap.get(equipment.categoryId) : undefined;
    return {
      ...item,
      equipment: equipment ? {
        id: equipment.id,
        name: equipment.name,
        category: category,
      } : undefined,
    } as Reservation;
  });

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
