import { Router } from 'express';
import { Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import AppDataSource from '../data-source';
import { Reservation, ReservationStatus } from '../entity/Reservation';
import { Equipment } from '../entity/Equipment';
import { User } from '../entity/User';

const reservationRouter = Router();
const reservationRepo = () => AppDataSource.getRepository(Reservation);
const equipmentRepo = () => AppDataSource.getRepository(Equipment);
const userRepo = () => AppDataSource.getRepository(User);

// ========== 予約可能数チェック ==========

// 指定期間の予約済み数量を取得
async function getReservedQuantity(
  equipmentId: number,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: number
): Promise<number> {
  const queryBuilder = reservationRepo()
    .createQueryBuilder('reservation')
    .select('COALESCE(SUM(reservation.quantity), 0)', 'total')
    .where('reservation.equipmentId = :equipmentId', { equipmentId })
    .andWhere('reservation.status IN (:...statuses)', {
      statuses: [ReservationStatus.PENDING, ReservationStatus.APPROVED]
    })
    .andWhere(
      '(reservation.startTime < :endTime AND reservation.endTime > :startTime)',
      { startTime, endTime }
    );

  if (excludeReservationId) {
    queryBuilder.andWhere('reservation.id != :excludeId', { excludeId: excludeReservationId });
  }

  const result = await queryBuilder.getRawOne();
  return parseInt(result.total) || 0;
}

// 予約可能かチェック
async function checkAvailability(
  equipmentId: number,
  startTime: Date,
  endTime: Date,
  requestedQuantity: number,
  excludeReservationId?: number
): Promise<{ available: boolean; remainingQuantity: number; totalQuantity: number; isUnlimited: boolean }> {
  const equipment = await equipmentRepo().findOne({ where: { id: equipmentId, isDeleted: false }, relations: ['category'] });
  if (!equipment || !equipment.isActive) {
    return { available: false, remainingQuantity: 0, totalQuantity: 0, isUnlimited: false };
  }

  // 無制限 or 消耗品カテゴリの場合は常に予約可能
  if (equipment.isUnlimited || equipment.category?.name === '消耗品') {
    return {
      available: true,
      remainingQuantity: -1, // -1 = 無制限
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

    const queryBuilder = reservationRepo()
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.equipment', 'equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .leftJoinAndSelect('reservation.user', 'user');

    if (equipmentId) {
      queryBuilder.andWhere('reservation.equipmentId = :equipmentId', {
        equipmentId: Number(equipmentId)
      });
    }

    if (startDate) {
      queryBuilder.andWhere('reservation.endTime >= :startDate', {
        startDate: new Date(startDate as string)
      });
    }

    if (endDate) {
      queryBuilder.andWhere('reservation.startTime <= :endDate', {
        endDate: new Date(endDate as string)
      });
    }

    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    queryBuilder.orderBy('reservation.startTime', 'ASC');

    const [items, total] = await queryBuilder.getManyAndCount();

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

    const reservations = await reservationRepo()
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.equipment', 'equipment')
      .where('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.APPROVED]
      })
      .andWhere('reservation.startTime <= :end', { end: new Date(end as string) })
      .andWhere('reservation.endTime >= :start', { start: new Date(start as string) })
      .orderBy('reservation.startTime', 'ASC')
      .getMany();

    // FullCalendar用のイベント形式に変換
    const events = reservations.map((r) => ({
      id: String(r.id),
      title: `${r.equipment?.name || r.customEquipmentName || '未設定'} - ${r.department}`,
      start: r.startTime,
      end: r.endTime,
      extendedProps: {
        equipmentName: r.equipment?.name || r.customEquipmentName || '未設定',
        department: r.department,
        applicantName: r.applicantName,
        quantity: r.quantity,
        status: r.status
      },
      backgroundColor: r.status === ReservationStatus.APPROVED ? '#38A169' : '#ED8936',
      borderColor: r.status === ReservationStatus.APPROVED ? '#2F855A' : '#DD6B20'
    }));

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
    const queryBuilder = equipmentRepo()
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .where('equipment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('equipment.isActive = :isActive', { isActive: true });

    if (categoryId) {
      queryBuilder.andWhere('equipment.categoryId = :categoryId', {
        categoryId: Number(categoryId)
      });
    }

    const equipments = await queryBuilder.orderBy('equipment.name', 'ASC').getMany();

    const limitedEquipmentIds = equipments
      .filter((equipment) => !equipment.isUnlimited && equipment.category?.name !== '消耗品')
      .map((equipment) => equipment.id);

    let reservedMap: Record<number, number> = {};

    if (limitedEquipmentIds.length > 0) {
      const reservationSums = await reservationRepo()
        .createQueryBuilder('reservation')
        .select('reservation.equipmentId', 'equipmentId')
        .addSelect('COALESCE(SUM(reservation.quantity), 0)', 'reservedQuantity')
        .where('reservation.equipmentId IN (:...equipmentIds)', { equipmentIds: limitedEquipmentIds })
        .andWhere('reservation.status IN (:...statuses)', {
          statuses: [ReservationStatus.PENDING, ReservationStatus.APPROVED]
        })
        .andWhere('reservation.startTime < :endOfDay AND reservation.endTime > :startOfDay', {
          startOfDay,
          endOfDay
        })
        .groupBy('reservation.equipmentId')
        .getRawMany();

      reservedMap = reservationSums.reduce<Record<number, number>>((acc, row) => {
        acc[row.equipmentId] = Number(row.reservedQuantity) || 0;
        return acc;
      }, {});
    }

    const result = equipments.map((equipment) => {
      const isUnlimited = equipment.isUnlimited || equipment.category?.name === '消耗品';
      const reservedQuantity = isUnlimited ? 0 : reservedMap[equipment.id] || 0;
      const remainingQuantity = isUnlimited ? -1 : equipment.quantity - reservedQuantity;
      return {
        ...equipment,
        remainingQuantity,
        isAvailable: isUnlimited || remainingQuantity > 0,
        isUnlimited
      };
    });

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

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const equipment = await equipmentRepo().findOne({ where: { id: Number(equipmentId), isDeleted: false } });
    if (!equipment) {
      return res.status(404).json({ message: '機器が見つかりません' });
    }

    // 月間の予約を取得
    const reservations = await reservationRepo()
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.user', 'user')
      .where('reservation.equipmentId = :equipmentId', { equipmentId: Number(equipmentId) })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.APPROVED]
      })
      .andWhere('reservation.startTime <= :endDate', { endDate })
      .andWhere('reservation.endTime >= :startDate', { startDate })
      .orderBy('reservation.startTime', 'ASC')
      .getMany();

    // 日ごとの残数を計算
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    const dailyAvailability: Record<string, { remaining: number; reservations: any[] }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayStart = new Date(Number(year), Number(month) - 1, day, 0, 0, 0);
      const dayEnd = new Date(Number(year), Number(month) - 1, day, 23, 59, 59);

      // その日に重なる予約を抽出
      const dayReservations = reservations.filter((r) => {
        const rStart = new Date(r.startTime);
        const rEnd = new Date(r.endTime);
        return rStart <= dayEnd && rEnd >= dayStart;
      });

      const reservedQuantity = dayReservations.reduce((sum, r) => sum + r.quantity, 0);

      dailyAvailability[dateStr] = {
        remaining: equipment.quantity - reservedQuantity,
        reservations: dayReservations.map((r) => ({
          id: r.id,
          quantity: r.quantity,
          purpose: r.purpose,
          userName: r.user?.name || '不明',
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

// 予約詳細取得
reservationRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await reservationRepo().findOne({
      where: { id: Number(id) },
      relations: ['equipment', 'equipment.category', 'user']
    });

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    res.json(reservation);
  } catch (error) {
    next(error);
  }
}); // Close the route definition properly

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

    let equipment = null;
    if (equipmentId) {
      // 予約可能かチェック
      const availability = await checkAvailability(equipmentId, start, end, quantity);
      if (!availability.available) {
        return res.status(400).json({
          message: `予約可能数を超えています（残り: ${availability.remainingQuantity}）`
        });
      }

      equipment = await equipmentRepo().findOne({ where: { id: equipmentId } });
      if (!equipment) {
        return res.status(404).json({ message: '機器が見つかりません' });
      }
    }

    const trimmedCustomName = typeof customEquipmentName === 'string' ? customEquipmentName.trim() : undefined;
    if (!equipment && !trimmedCustomName) {
      return res.status(400).json({ message: 'その他予約の場合は名称を入力してください' });
    }

    const reservation = reservationRepo().create({
      equipment: equipment ?? undefined,
      customEquipmentName: equipment ? undefined : trimmedCustomName,
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

    const saved = await reservationRepo().save(reservation);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

// 予約更新
reservationRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, quantity, purpose, location, notes, status } = req.body;

    const reservation = await reservationRepo().findOne({
      where: { id: Number(id) },
      relations: ['equipment']
    });

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    // 日時・数量変更時は再チェック
    if (reservation.equipment && (startTime || endTime || quantity)) {
      const newStart = startTime ? new Date(startTime) : reservation.startTime;
      const newEnd = endTime ? new Date(endTime) : reservation.endTime;
      const newQuantity = quantity ?? reservation.quantity;

      const availability = await checkAvailability(
        reservation.equipment.id,
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

      reservation.startTime = newStart;
      reservation.endTime = newEnd;
      reservation.quantity = newQuantity;
    } else {
      if (startTime) reservation.startTime = new Date(startTime);
      if (endTime) reservation.endTime = new Date(endTime);
      if (quantity) reservation.quantity = quantity;
    }

    if (purpose !== undefined) reservation.purpose = purpose;
    if (location !== undefined) reservation.location = location;
    if (notes !== undefined) reservation.notes = notes;
    if (status !== undefined) reservation.status = status;

    const saved = await reservationRepo().save(reservation);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// 予約キャンセル
reservationRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reservation = await reservationRepo().findOne({ where: { id: Number(id) } });

    if (!reservation) {
      return res.status(404).json({ message: '予約が見つかりません' });
    }

    reservation.status = ReservationStatus.CANCELLED;
    await reservationRepo().save(reservation);

    res.json({ message: '予約をキャンセルしました' });
  } catch (error) {
    next(error);
  }
});

export default reservationRouter;
