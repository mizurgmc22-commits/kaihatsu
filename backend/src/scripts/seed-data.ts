/**
 * サンプルデータ投入スクリプト
 * 使用方法: npx ts-node src/scripts/seed-data.ts
 */
import 'reflect-metadata';
import AppDataSource from '../data-source';
import { Equipment } from '../entity/Equipment';
import { EquipmentCategory } from '../entity/EquipmentCategory';
import { DashboardContent, ContentType } from '../entity/DashboardContent';

async function seedData() {
  try {
    await AppDataSource.initialize();
    console.log('データベースに接続しました');

    const categoryRepo = AppDataSource.getRepository(EquipmentCategory);
    const equipmentRepo = AppDataSource.getRepository(Equipment);

    // 既存データ確認
    const existingEquipment = await equipmentRepo.count();
    if (existingEquipment > 0) {
      console.log(`既に${existingEquipment}件の資機材データが存在します。資機材作成はスキップします。`);
      // await AppDataSource.destroy(); // 削除
      // return; // 削除
    }

    // カテゴリ作成（正しいカテゴリ: master-equipment.json に基づく）
    const categories = [
      { name: '蘇生講習資機材', description: '蘇生講習用の機材' },
      { name: 'トレーニング資機材', description: 'トレーニング用の機材' },
      { name: '機械類', description: '機械類（無制限レンタル可）' },
      { name: '消耗品', description: '消耗品（無制限レンタル可）' },
      { name: 'その他', description: 'その他の機材' }
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

    // 資機材サンプルデータ（master-equipment.json に基づく代表的な機材）
    const equipmentData = [
      {
        name: 'ALS Simulator',
        quantity: 2,
        category: savedCategories.find(c => c.name === '蘇生講習資機材')
      },
      {
        name: 'Resusci Anne',
        quantity: 2,
        category: savedCategories.find(c => c.name === '蘇生講習資機材')
      },
      {
        name: 'AEDトレーナー',
        quantity: 9,
        category: savedCategories.find(c => c.name === '蘇生講習資機材')
      },
      {
        name: 'リトルアン',
        quantity: 9,
        category: savedCategories.find(c => c.name === '蘇生講習資機材')
      },
      {
        name: '採血・静注シミュレータ シンジョー',
        quantity: 2,
        category: savedCategories.find(c => c.name === 'トレーニング資機材')
      },
      {
        name: 'エンドワークプロII',
        quantity: 2,
        category: savedCategories.find(c => c.name === 'トレーニング資機材')
      },
      {
        name: '鑷子（ピンセット）',
        description: 'クーパー',
        quantity: 1,
        isUnlimited: true,
        category: savedCategories.find(c => c.name === '機械類')
      },
      {
        name: '針',
        description: '糸',
        quantity: 1,
        isUnlimited: true,
        category: savedCategories.find(c => c.name === '消耗品')
      }
    ];

    for (const eq of equipmentData) {
      const existing = await equipmentRepo.findOne({ where: { name: eq.name } });
      if (existing) {
        console.log(`資機材「${eq.name}」は既に存在します。スキップ。`);
        continue;
      }
      const equipment = equipmentRepo.create({
        name: eq.name,
        description: eq.description,
        quantity: eq.quantity,
        isActive: true,
        isUnlimited: (eq as any).isUnlimited || false,
        isDeleted: false,
        category: eq.category
      });
      await equipmentRepo.save(equipment);
      console.log(`資機材作成: ${eq.name}`);
    }

    // ダッシュボードコンテンツの作成
    const contentRepo = AppDataSource.getRepository(DashboardContent);
    const existingContent = await contentRepo.count();

    // 既存データのクリア（ダッシュボードコンテンツ）
    if (existingContent > 0) {
      console.log(`既存のダッシュボードコンテンツをクリアします...`);
      await contentRepo.clear();
    }
    
    // コンテンツ作成（常に実行）
    const contents = [
      {
        type: ContentType.FLOW,
        title: "予約の流れ",
        content: "1. カレンダーから日時を選択\n2. 機材を選択\n3. 予約確定",
        order: 1,
        isActive: true
      },
      {
        type: ContentType.GUIDE,
        title: "利用ガイド",
        content: "利用ガイドの内容です。", 
        linkUrl: "/guide",
        order: 1,
        isActive: true
      },
       {
        type: ContentType.ANNOUNCEMENT,
        title: "システムメンテナンスのお知らせ",
        content: "2月20日 12:00-13:00 にメンテナンスを行います。",
        order: 1,
        isActive: true
      },
       {
        type: ContentType.LINK,
        title: "関連リンク",
        linkUrl: "https://example.com",
        order: 1,
        isActive: true
      }
    ];

    for (const content of contents) {
      const newContent = contentRepo.create(content);
      await contentRepo.save(newContent);
      console.log(`コンテンツ作成: ${content.title}`);
    }

    console.log('\nサンプルデータの投入が完了しました！');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

seedData();
