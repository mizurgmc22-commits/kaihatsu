import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import AppDataSource from './data-source';
import { Equipment } from './entity/Equipment';
import { EquipmentCategory } from './entity/EquipmentCategory';

type MasterCategory = {
  key: string;
  name: string;
  description?: string;
};

type MasterEquipment = {
  name: string;
  quantity: number;
  categoryKey: string;
  description?: string;
  isUnlimited?: boolean;
};

type MasterData = {
  categories: MasterCategory[];
  equipment: MasterEquipment[];
};

const masterDataPath = path.join(__dirname, 'data', 'master-equipment.json');

function loadMasterData(): MasterData {
  const raw = fs.readFileSync(masterDataPath, 'utf-8');
  return JSON.parse(raw) as MasterData;
}

async function reset() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const equipmentRepo = AppDataSource.getRepository(Equipment);
    const categoryRepo = AppDataSource.getRepository(EquipmentCategory);
    const masterData = loadMasterData();

    // 既存データ削除
    await equipmentRepo.createQueryBuilder().delete().from(Equipment).execute();
    await categoryRepo.createQueryBuilder().delete().from(EquipmentCategory).execute();
    console.log('Cleared existing data');

    // カテゴリ作成
    const categoryMap: Record<string, EquipmentCategory> = {};
    for (const cat of masterData.categories) {
      const category = categoryRepo.create({
        name: cat.name,
        description: cat.description
      });
      const saved = await categoryRepo.save(category);
      categoryMap[cat.key] = saved;
      console.log(`Created category: ${cat.name} (key: ${cat.key})`);
    }

    // 機器作成
    for (const item of masterData.equipment) {
      const category = categoryMap[item.categoryKey];
      if (!category) {
        console.warn(`Skip: ${item.name} (category ${item.categoryKey} not found)`);
        continue;
      }

      const equipment = equipmentRepo.create({
        name: item.name,
        quantity: item.quantity,
        description: item.description || undefined,
        category: category || undefined,
        isActive: true,
        isUnlimited: item.isUnlimited || false
      });

      await equipmentRepo.save(equipment);
      console.log(`Created: ${item.name} (qty: ${item.quantity})`);
    }

    console.log('\nReset completed!');
    console.log(`Categories: ${masterData.categories.length}`);
    console.log(`Equipment: ${masterData.equipment.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

reset();
