import { Router } from 'express';
import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { findAllEquipment } from '../repositories/equipmentRepository';
import { countActiveUsers } from '../repositories/userRepository';

const dashboardRouter = Router();

const getStartOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (date: Date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

dashboardRouter.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const todayEnd = getEndOfDay(now);

    const Timestamp = admin.firestore.Timestamp;
    const reservationCollection = db.collection('reservations');

    // 全予約を取得し、アプリケーション側でフィルタ（複合インデックス回避）
    const allReservationsSnapshot = await reservationCollection.get();

    // 今日の予約数
    const todayReservations = allReservationsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const startTime = data.startTime?.toDate?.();
      return startTime && startTime >= todayStart && startTime <= todayEnd;
    }).length;

    // アクティブな機器数
    const { total: availableEquipment } = await findAllEquipment({ isActive: true });

    // 現在使用中の機器数
    let inUseEquipment = 0;
    for (const doc of allReservationsSnapshot.docs) {
      const data = doc.data();
      if (!['pending', 'approved'].includes(data.status)) continue;
      const startTime = data.startTime?.toDate?.();
      const endTime = data.endTime?.toDate?.();
      if (startTime && endTime && startTime <= now && endTime >= now) {
        inUseEquipment++;
      }
    }

    // アクティブなユーザー数
    const totalUsers = await countActiveUsers();

    res.json({ todayReservations, availableEquipment, inUseEquipment, totalUsers });
  } catch (error) {
    next(error);
  }
});

export default dashboardRouter;