import 'reflect-metadata';
import AppDataSource from './data-source';
import { Equipment } from './entity/Equipment';

// 機械類(4)と消耗品(5)を無制限に設定
const UNLIMITED_CATEGORY_IDS = [4, 5];

async function setUnlimited() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const equipmentRepo = AppDataSource.getRepository(Equipment);

    const result = await equipmentRepo
      .createQueryBuilder()
      .update(Equipment)
      .set({ isUnlimited: true })
      .where('categoryId IN (:...ids)', { ids: UNLIMITED_CATEGORY_IDS })
      .execute();

    console.log(`Updated ${result.affected} items to unlimited`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setUnlimited();
