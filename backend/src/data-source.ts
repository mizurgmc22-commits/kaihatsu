import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import { User } from './entity/User';
import { Equipment } from './entity/Equipment';
import { Reservation } from './entity/Reservation';
import { EquipmentCategory } from './entity/EquipmentCategory';

// データベースファイルのパスを固定（プロジェクトルートのdataフォルダに保存）
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: process.env.NODE_ENV !== 'production', // 本番環境ではfalse
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Equipment, Reservation, EquipmentCategory],
  migrations: ['src/migrations/*.ts'],
  subscribers: []
});

export default AppDataSource;
