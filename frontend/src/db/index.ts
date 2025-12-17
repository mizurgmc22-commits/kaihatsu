import Dexie, { type Table } from 'dexie';
import type { User, Equipment, EquipmentCategory, Reservation } from './models';

// データベースクラス定義
class EquipmentBookingDB extends Dexie {
  users!: Table<User, number>;
  equipment!: Table<Equipment, number>;
  categories!: Table<EquipmentCategory, number>;
  reservations!: Table<Reservation, number>;

  constructor() {
    super('EquipmentBookingDB');
    
    this.version(1).stores({
      users: '++id, email, role, department, isActive',
      equipment: '++id, name, categoryId, isActive, isDeleted',
      categories: '++id, name',
      reservations: '++id, userId, equipmentId, status, startTime, endTime'
    });
  }
}

// シングルトンインスタンス
export const db = new EquipmentBookingDB();

// データベース初期化
export async function initializeDatabase(): Promise<void> {
  const userCount = await db.users.count();
  
  if (userCount === 0) {
    // 初期管理者アカウントを作成
    const { hashPassword } = await import('../services/auth');
    const hashedPassword = await hashPassword('Sazan-Admin@2025');
    
    await db.users.add({
      name: '管理者',
      email: 'admin@sazan-with.local',
      password: hashedPassword,
      role: 'admin',
      department: 'システム管理',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Default admin created');
  }
}

export default db;
