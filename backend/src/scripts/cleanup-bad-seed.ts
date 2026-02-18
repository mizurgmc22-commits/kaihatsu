/**
 * 不正なシードデータをクリーンアップするスクリプト
 * 医療機器、視聴覚機器、事務機器カテゴリとその関連機器を削除する
 * 
 * 使用方法: npx ts-node src/scripts/cleanup-bad-seed.ts
 */
import 'reflect-metadata';
import AppDataSource from '../data-source';
import { Equipment } from '../entity/Equipment';
import { EquipmentCategory } from '../entity/EquipmentCategory';

const BAD_CATEGORIES = ['医療機器', '視聴覚機器', '事務機器'];

async function cleanup() {
  try {
    await AppDataSource.initialize();
    console.log('データベースに接続しました');

    const categoryRepo = AppDataSource.getRepository(EquipmentCategory);
    const equipmentRepo = AppDataSource.getRepository(Equipment);

    for (const catName of BAD_CATEGORIES) {
      const category = await categoryRepo.findOne({
        where: { name: catName },
        relations: ['equipments'],
      });

      if (!category) {
        console.log(`カテゴリ「${catName}」は見つかりませんでした。スキップします。`);
        continue;
      }

      // このカテゴリに紐づく機器を削除
      if (category.equipments && category.equipments.length > 0) {
        for (const eq of category.equipments) {
          await equipmentRepo.remove(eq);
          console.log(`  機器削除: ${eq.name}`);
        }
      }

      // カテゴリ自体を削除
      await categoryRepo.remove(category);
      console.log(`カテゴリ削除: ${catName}`);
    }

    console.log('\nクリーンアップ完了！');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

cleanup();
