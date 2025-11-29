import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Equipment } from './entity/Equipment';
import { Reservation } from './entity/Reservation';
import { EquipmentCategory } from './entity/EquipmentCategory';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true, // 開発環境では true に設定
  logging: true,
  entities: [User, Equipment, Reservation, EquipmentCategory],
  migrations: ['src/migrations/*.ts'],
  subscribers: []
});

export default AppDataSource;
