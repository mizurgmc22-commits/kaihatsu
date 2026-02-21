import { Router } from 'express';
import {
  findAllReservations,
  findReservationById,
  findReservationEvents,
  findReservationsForEquipmentInRange,
  getReservedQuantity,
  createReservation,
  updateReservation,
  deleteReservation,
  toDate,
} from '../repositories/reservationRepository';
import {
  findAllEquipment,
  findEquipmentById,
} from '../repositories/equipmentRepository';

const reservationRouter = Router();

// ステータス定数
const ReservationStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// ========== 予約可能数チェック ==========

async function checkAvailability(
  equipmentId: string,
  startTime: Date,
  endTime: Date,
  requestedQuantity: number,
  excludeReservationId?: string
): Promise<{ available: boolean; remainingQuantity: number; totalQuantity: number; isUnlimited: boolean }> {
  const equipment = await findEquipmentById(equipmentId);
  if (!equipment || !equipment.isActive || equipment.isDeleted) {
    return { available: false, remainingQuantity: 0, totalQuantity: 0, isUnlimited: false };
  }

  // 無制限 or 消耗品カテゴリの場合は常に予約可能
  if (equipment.isUnlimited || equipment.category?.name === '消耗品') {
    return {
      available: true,
      remainingQuantity: -1,
      totalQuantity: equipment.quantity,
      isUnlimited: true
    };
  }

  const reservedQuantity = await getReservedQuantity(equipmentId, startTime, endTime, excludeReservationId);
  const remainingQuantity = equipment.quantity - reservedQuantity;

  return {
    available: remainingQuantity >= requestedQuantity,
    remainingQuantity,
    totalQuantity: equipment.quantity,
    isUnlimited: false
  };
}

// ========== 予約 CRUD ==========

// 予約一覧取得
reservationRouter.get('/', async (req, res, next) => {
  try {
    const { equipmentId, startDate, endDate, status, page = 1, limit = 20 } = req.query;

    const { items: rawItems, total } = await findAllReservations({
      equipmentId: equipmentId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      status: status as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });

    // equipment情報を付加
    const items = await Promise.all(
      rawItems.map(async (r) => {
        let equipment = undefined;
        if (r.equipmentId) {
          equipment = await findEquipmentById(r.equipmentId);
        }
        return {
          ...r,
          equipment,
          startTime: toDate(r.startTime)?.toISOString(),
          endTime: toDate(r.endTime)?.toISOString(),
          createdAt: r.createdAt ? (r.createdAt as any).toDate?.()?.toISOString?.() || r.createdAt : undefined,
          updatedAt: r.updatedAt ? (r.updatedAt as any).toDate?.()?.toISOString?.() || r.updatedAt : undefined,
        };
      })
    );

    res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// カレンダー表示用の予約イベント一覧
reservationRouter.get('/events', async (req, res, next) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: '開始日と終了日は必須です' });
    }

    const reservations = await findReservationEvents(start as string, end as string);

    // FullCalendar用のイベント形式に変換
    const eventsPromises = reservations
      .filter((r) => [ReservationStatus.PENDING, ReservationStatus.APPROVED].includes(r.status))
      .map(async (r) => {
        let equipmentName = r.customEquipmentName || '未設定';
        if (r.equipmentId) {
          const equipment = await findEquipmentById(r.equipmentId);
          if (equipment) equipmentName = equipment.name;
        }

        return {
          id: r.id,
          title: `${equipmentName} - ${r.department}`,
          start: toDate(r.startTime)?.toISOString(),
          end: toDate(r.endTime)?.toISOString(),
          extendedProps: {
            equipmentName,
            department: r.department,
            applicantName: r.applicantName,
            quantity: r.quantity,
            status: r.status
          },
          backgroundColor: r.status === ReservationStatus.APPROVED ? '#38A169' : '#ED8936',
          borderColor: r.status === ReservationStatus.APPROVED ? '#2F855A' : '#DD6B20'
        };
      });

    const events = await Promise.all(eventsPromises);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// 特定日の予約可能機器一覧
reservationRouter.get('/available', async (req, res, next) => {
  try {
    const { date, categoryId } = req.query;

    if (!date) {
      return res.status(400).json({ message: '日付は必須です' });
    }

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // アクティブな機器を取得
    const { items: equipments } = await findAllEquipment({
      isActive: true,
      categoryId: categoryId as string | undefined,
    });

    const result = await Promise.all(
      equipments.map(async (equipment) => {
        const isUnlimited = equipment.isUnlimited || equipment.category?.name === '消耗品';
        let reservedQuantity = 0;

        if (!isUnlimited) {
          reservedQuantity = await getReservedQuantity(equipment.id, startOfDay, endOfDay);
        }

        const remainingQuantity = isUnlimited ? -1 : equipment.quantity - reservedQuantity;
        return {
          ...equipment,
          remainingQuantity,
          isAvailable: isUnlimited || remainingQuantity > 0,
          isUnlimited
        };
      })
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// 機器の月間予約状況取得（カレンダー用）
reservationRouter.get('/calendar/:equipmentId', async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: '年月は必須です' });
    }

    const equipment = await findEquipmentById(equipmentId);
    if (!equipment || equipment.isDeleted) {
      return res.status(404).json({ message: '機器が見つかりません' });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    // 月間の予約を取得
    const reservations = await findReservationsForEquipmentInRange(equipmentId, startDate, endDate);

    // 日ごとの残数を計算
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    const dailyAvailability: Record<string, { remaining: number; reservations: any[] }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayStart = new Date(Number(year), Number(month) - 1, day, 0, 0, 0);
      const dayEnd = new Date(Number(year), Number(month) - 1, day, 23, 59, 59);

      // その日に重なる予約を抽出
      const dayReservations = reservations.filter((r) => {
        const rStart = toDate(r.startTime);
        const rEnd = toDate(r.endTime);
        if (!rStart || !rEnd) return false;
        return rStart <= dayEnd && rEnd >= dayStart;
      });

      const reservedQuantity = dayReservations.reduce((sum, r) => sum + r.quantity, 0);

      dailyAvailability[dateStr] = {
        remaining: equipment.quantity - reservedQuantity,
        reservations: dayReservations.map((r) => ({
          id: r.id,
          quantity: r.quantity,
          purpose: r.purpose,
          userName: r.applicantName || '不明',
          status: r.status
        }))
      };
    }

    res.json({
      equipment: {
        id: equipment.id,
        name: equipment.name,
        totalQuantity: equipment.quantity
      },
      dailyAvailability
    });
  } catch (error) {
    next(error);
  }
});

// ========== CSVエクスポート ==========
// 注意: /:id より前に定義する必要がある

// 予約データCSVエクスポート（管理者用）
reservationRouter.get('/admin/export', async (req, res, next) => {
  try {
    const { status, startDate, endDate, equipmentId, department } = req.query;

    const { items: rawReservations } = await findAllReservations({
      equipmentId: equipmentId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      status: status as string | undefined,
      limit: 10000, // CSVでは全件取得
    });

    // department フィルタ（Firestoreでは部分一致が難しいためアプリケーション側で）
    let reservations = rawReservations;
    if (department) {
      const deptStr = department as string;
      reservations = reservations.filter((r) =>
        r.department.includes(deptStr)
      );
    }

    // equipment情報を付加
    const reservationsWithEquipment = await Promise.all(
      reservations.map(async (r) => {
        let equipment = undefined;
        if (r.equipmentId) {
          equipment = await findEquipmentById(r.equipmentId);
        }
        return { ...r, equipment };
      })
    );

    // CSV生成
    const BOM = '\uFEFF';
    const headers = [
      '予約ID', 'ステータス', '機材名', 'カテゴリ', '部署',
      '申請者名', '連絡先', '利用開始日時', '利用終了日時',
      '数量', '利用目的', '利用場所', '作成日時'
    ];

    const statusLabels: Record<string, string> = {
      pending: '承認待ち', approved: '承認済み', rejected: '却下',
      cancelled: 'キャンセル', completed: '完了'
    };

    const formatDateTime = (value: any) => {
      const d = toDate(value);
      if (!d) return '';
      return d.toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    };

    const escapeCSV = (value: string | number | undefined | null): string => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = reservationsWithEquipment.map((r) => [
      r.id,
      statusLabels[r.status] || r.status,
      r.equipment?.name || r.customEquipmentName || '',
      r.equipment?.category?.name || '',
      r.department,
      r.applicantName,
      r.contactInfo,
      formatDateTime(r.startTime),
      formatDateTime(r.endTime),
      r.quantity,
      r.purpose || '',
      r.location || '',
      formatDateTime(r.createdAt)
    ]);

    const csvContent = BOM + [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');

    const filename = `reservations_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// ========== ユーザー向け予約履歴 ==========
// 注意: /:id より前に定義する必要がある

// 自分の予約履歴取得（連絡先で検索）
reservationRouter.get('/my/history', async (req, res, next) => {
  try {
    const { contactInfo, page = 1, limit = 20 } = req.query;

    if (!contactInfo) {
      return res.status(400).json({ message: '連絡先は必須です' });
    }

    const { items: rawItems, total } = await findAllReservations({
      contactInfo: contactInfo as string,
      page: Number(page),
      limit: Number(limit),
    });

    // equipment情報を付加
    const items = await Promise.all(
      rawItems.map(async (r) => {
        let equipment = undefined;
        if (r.equipmentId) {
          equipment = await findEquipmentById(r.equipmentId);
        }
        return {
          ...r,
          equipment,
          startTime: toDate(r.startTime)?.toISOString(),
          endTime: toDate(r.endTime)?.toISOString(),
          createdAt: r.createdAt ? (r.createdAt as any).toDate?.()?.toISOString?.() || r.createdAt : undefined,
          updatedAt: r.updatedAt ? (r.updatedAt as any).toDate?.()?.toISOString?.() || r.updatedAt : undefined,
        };
      })
    );

    res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// ユーザーによる予約キャンセル
reservationRouter.post('/my/cancel/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contactInfo } = req.body;

    if (!contactInfo) {
      return res.status(400).json({ message: '連絡先は必須です' });
    }

    const reservation = await findReservationById(id);

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    // 連絡先で本人確認
    if (reservation.contactInfo !== contactInfo) {
      return res.status(403).json({ message: 'この予約をキャンセルする権限がありません' });
    }

    // キャンセル可能なステータスかチェック
    if (![ReservationStatus.PENDING, ReservationStatus.APPROVED].includes(reservation.status)) {
      return res.status(400).json({ message: 'この予約はキャンセルできません' });
    }

    // 開始日前かチェック
    const now = new Date();
    const startTime = toDate(reservation.startTime);
    if (startTime && startTime <= now) {
      return res.status(400).json({ message: '利用開始後の予約はキャンセルできません' });
    }

    const updated = await updateReservation(id, { status: ReservationStatus.CANCELLED });
    res.json({ message: '予約をキャンセルしました', reservation: updated });
  } catch (error) {
    next(error);
  }
});

// 予約詳細取得
reservationRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationById(id);

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    // equipment情報を付加
    let equipment = undefined;
    if (reservation.equipmentId) {
      equipment = await findEquipmentById(reservation.equipmentId);
    }

    res.json({
      ...reservation,
      equipment,
      startTime: toDate(reservation.startTime)?.toISOString(),
      endTime: toDate(reservation.endTime)?.toISOString(),
      createdAt: reservation.createdAt ? (reservation.createdAt as any).toDate?.()?.toISOString?.() || reservation.createdAt : undefined,
      updatedAt: reservation.updatedAt ? (reservation.updatedAt as any).toDate?.()?.toISOString?.() || reservation.updatedAt : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// 予約作成
reservationRouter.post('/', async (req, res, next) => {
  try {
    const {
      equipmentId,
      customEquipmentName,
      department,
      applicantName,
      contactInfo,
      startTime,
      endTime,
      quantity = 1,
      purpose,
      location,
      notes
    } = req.body;

    if ((!equipmentId && !customEquipmentName) || !startTime || !endTime) {
      return res.status(400).json({ message: '機器または名称、開始日時、終了日時は必須です' });
    }

    if (!department || !applicantName || !contactInfo) {
      return res.status(400).json({ message: '部署、氏名、連絡先は必須です' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: '終了日時は開始日時より後にしてください' });
    }

    if (equipmentId) {
      // 予約可能かチェック
      const availability = await checkAvailability(equipmentId, start, end, quantity);
      if (!availability.available) {
        return res.status(400).json({
          message: `予約可能数を超えています（残り: ${availability.remainingQuantity}）`
        });
      }

      const equipment = await findEquipmentById(equipmentId);
      if (!equipment) {
        return res.status(404).json({ message: '機器が見つかりません' });
      }
    }

    const trimmedCustomName = typeof customEquipmentName === 'string' ? customEquipmentName.trim() : undefined;
    if (!equipmentId && !trimmedCustomName) {
      return res.status(400).json({ message: 'その他予約の場合は名称を入力してください' });
    }

    const saved = await createReservation({
      equipmentId: equipmentId || undefined,
      customEquipmentName: equipmentId ? undefined : trimmedCustomName,
      department,
      applicantName,
      contactInfo,
      startTime: start,
      endTime: end,
      quantity,
      purpose,
      location,
      notes,
      status: ReservationStatus.PENDING
    });

    res.status(201).json({
      ...saved,
      startTime: toDate(saved.startTime)?.toISOString(),
      endTime: toDate(saved.endTime)?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// 予約更新
reservationRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, quantity, purpose, location, notes, status } = req.body;

    const reservation = await findReservationById(id);

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    // 日時・数量変更時は再チェック
    if (reservation.equipmentId && (startTime || endTime || quantity)) {
      const newStart = startTime ? new Date(startTime) : toDate(reservation.startTime)!;
      const newEnd = endTime ? new Date(endTime) : toDate(reservation.endTime)!;
      const newQuantity = quantity ?? reservation.quantity;

      const availability = await checkAvailability(
        reservation.equipmentId,
        newStart,
        newEnd,
        newQuantity,
        reservation.id
      );

      if (!availability.available) {
        return res.status(400).json({
          message: `予約可能数を超えています（残り: ${availability.remainingQuantity}）`
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (quantity !== undefined) updateData.quantity = quantity;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const saved = await updateReservation(id, updateData);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// 予約キャンセル
reservationRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await findReservationById(id);

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    await updateReservation(id, { status: ReservationStatus.CANCELLED });
    res.json({ message: '予約をキャンセルしました' });
  } catch (error) {
    next(error);
  }
});

export default reservationRouter;
