import { Router } from 'express';
import AppDataSource from '../data-source';
import { Reservation, ReservationStatus } from '../entity/Reservation';
import { Equipment } from '../entity/Equipment';
import { User } from '../entity/User';

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
    const reservationRepo = AppDataSource.getRepository(Reservation);
    const equipmentRepo = AppDataSource.getRepository(Equipment);
    const userRepo = AppDataSource.getRepository(User);

    const now = new Date();
    const todayStart = getStartOfDay(now);
    const todayEnd = getEndOfDay(now);

    const todayReservations = await reservationRepo
      .createQueryBuilder('reservation')
      .where('reservation.startTime BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .getCount();

    const availableEquipment = await equipmentRepo.count({ where: { isActive: true } });

    const inUseEquipment = await reservationRepo
      .createQueryBuilder('reservation')
      .where('reservation.startTime <= :now AND reservation.endTime >= :now', { now })
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: [ReservationStatus.APPROVED, ReservationStatus.PENDING]
      })
      .getCount();

    const totalUsers = await userRepo.count({ where: { isActive: true } });

    res.json({ todayReservations, availableEquipment, inUseEquipment, totalUsers });
  } catch (error) {
    next(error);
  }
});

export default dashboardRouter;