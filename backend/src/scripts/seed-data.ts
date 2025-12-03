/**
 * サンプルデータ投入スクリプト
 * 使用方法: npx ts-node src/scripts/seed-data.ts
 */
import 'reflect-metadata';
import AppDataSource from '../data-source';
import { Equipment } from '../entity/Equipment';
import { EquipmentCategory } from '../entity/EquipmentCategory';

async function seedData() {
  try {
    await AppDataSource.initialize();
    console.log('データベースに接続しました');

    const categoryRepo = AppDataSource.getRepository(EquipmentCategory);
    const equipmentRepo = AppDataSource.getRepository(Equipment);

    // 既存データ確認
    const existingEquipment = await equipmentRepo.count();
    if (existingEquipment > 0) {
      console.log(`既に${existingEquipment}件の資機材データが存在します。スキップします。`);
      await AppDataSource.destroy();
      return;
    }

    // カテゴリ作成
    const categories = [
      { name: '医療機器', description: '医療用の機器・装置' },
      { name: '事務機器', description: 'オフィス用機器' },
      { name: '視聴覚機器', description: 'プロジェクター、スクリーン等' },
      { name: '消耗品', description: '使い捨て・消耗品類' }
    ];

    const savedCategories: EquipmentCategory[] = [];
    for (const cat of categories) {
      const existing = await categoryRepo.findOne({ where: { name: cat.name } });
      if (existing) {
        savedCategories.push(existing);
      } else {
        const category = categoryRepo.create(cat);
        const saved = await categoryRepo.save(category);
        savedCategories.push(saved);
        console.log(`カテゴリ作成: ${cat.name}`);
      }
    }

    // 資機材サンプルデータ
    const equipmentData = [
      {
        name: '心電計',
        description: '12誘導心電図記録装置',
        quantity: 5,
        location: '1階 検査室',
        category: savedCategories.find(c => c.name === '医療機器')
      },
      {
        name: '血圧計（自動）',
        description: '自動血圧測定装置',
        quantity: 10,
        location: '各病棟',
        category: savedCategories.find(c => c.name === '医療機器')
      },
      {
        name: 'パルスオキシメーター',
        description: '経皮的動脈血酸素飽和度測定器',
        quantity: 20,
        location: '各病棟',
        category: savedCategories.find(c => c.name === '医療機器')
      },
      {
        name: 'プロジェクター',
        description: '会議室用プロジェクター',
        quantity: 3,
        location: '総務課',
        category: savedCategories.find(c => c.name === '視聴覚機器')
      },
      {
        name: 'スクリーン（移動式）',
        description: '100インチ移動式スクリーン',
        quantity: 2,
        location: '総務課',
        category: savedCategories.find(c => c.name === '視聴覚機器')
      },
      {
        name: 'ノートPC（貸出用）',
        description: '研修・会議用ノートパソコン',
        quantity: 5,
        location: 'IT管理室',
        category: savedCategories.find(c => c.name === '事務機器')
      },
      {
        name: 'ポインター（レーザー）',
        description: 'プレゼン用レーザーポインター',
        quantity: 10,
        location: '総務課',
        isUnlimited: true,
        category: savedCategories.find(c => c.name === '事務機器')
      }
    ];

    for (const eq of equipmentData) {
      const equipment = equipmentRepo.create({
        name: eq.name,
        description: eq.description,
        quantity: eq.quantity,
        location: eq.location,
        isActive: true,
        isUnlimited: (eq as any).isUnlimited || false,
        isDeleted: false,
        category: eq.category
      });
      await equipmentRepo.save(equipment);
      console.log(`資機材作成: ${eq.name}`);
    }

    console.log('\nサンプルデータの投入が完了しました！');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

seedData();
