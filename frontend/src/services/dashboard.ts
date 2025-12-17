import { db } from '../db';

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  totalReservations: number;
  pendingReservations: number;
  approvedReservations: number;
  todayReservations: number;
  totalUsers: number;
  activeUsers: number;
}

// ダッシュボード統計情報取得
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  // 資機材統計
  const allEquipment = await db.equipment.filter(e => !e.isDeleted).toArray();
  const totalEquipment = allEquipment.length;
  const activeEquipment = allEquipment.filter(e => e.isActive).length;
  
  // 予約統計
  const allReservations = await db.reservations.toArray();
  const totalReservations = allReservations.length;
  const pendingReservations = allReservations.filter(r => r.status === 'pending').length;
  const approvedReservations = allReservations.filter(r => r.status === 'approved').length;
  const todayReservations = allReservations.filter(r => {
    const startTime = new Date(r.startTime);
    return startTime >= todayStart && startTime < todayEnd;
  }).length;
  
  // ユーザー統計
  const allUsers = await db.users.filter(u => !u.deletedAt).toArray();
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.isActive).length;
  
  return {
    totalEquipment,
    activeEquipment,
    totalReservations,
    pendingReservations,
    approvedReservations,
    todayReservations,
    totalUsers,
    activeUsers
  };
}

// 最近の予約取得
export async function getRecentReservations(limit: number = 5) {
  const reservations = await db.reservations
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
  
  // リレーション情報を付加
  const result = [];
  for (const reservation of reservations) {
    const user = reservation.userId ? await db.users.get(reservation.userId) : undefined;
    const equipment = reservation.equipmentId ? await db.equipment.get(reservation.equipmentId) : undefined;
    
    result.push({
      ...reservation,
      user: user ? { ...user, password: '' } : undefined,
      equipment: equipment ?? undefined
    });
  }
  
  return result;
}

// 月別予約統計
export async function getMonthlyStats(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const reservations = await db.reservations
    .filter(r => {
      const startTime = new Date(r.startTime);
      return startTime >= startDate && startTime <= endDate;
    })
    .toArray();
  
  // 日別集計
  const dailyStats: Record<number, number> = {};
  for (const reservation of reservations) {
    const day = new Date(reservation.startTime).getDate();
    dailyStats[day] = (dailyStats[day] || 0) + 1;
  }
  
  // ステータス別集計
  const statusStats = {
    pending: reservations.filter(r => r.status === 'pending').length,
    approved: reservations.filter(r => r.status === 'approved').length,
    rejected: reservations.filter(r => r.status === 'rejected').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    completed: reservations.filter(r => r.status === 'completed').length
  };
  
  return {
    total: reservations.length,
    dailyStats,
    statusStats
  };
}
