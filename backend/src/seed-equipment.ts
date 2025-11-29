import 'reflect-metadata';
import AppDataSource from './data-source';
import { Equipment } from './entity/Equipment';
import { EquipmentCategory } from './entity/EquipmentCategory';

const equipmentData = [
  // 蘇生講習資機材 (categoryId: 3)
  { name: 'ALS Simulator', quantity: 2, categoryId: 3 },
  { name: 'Resusci Anne', quantity: 2, categoryId: 3 },
  { name: 'セーブマン', quantity: 1, categoryId: 3 },
  { name: 'ナーシングアン', quantity: 2, categoryId: 3 },
  { name: 'シムベビー', quantity: 1, categoryId: 3 },
  { name: 'リトルアン', quantity: 9, categoryId: 3 },
  { name: 'リトルジュニア', quantity: 4, categoryId: 3 },
  { name: 'ベビーアン', quantity: 4, categoryId: 3 },
  { name: '新生児蘇生モデル', quantity: 3, categoryId: 3 },
  { name: 'AEDトレーナー', quantity: 9, categoryId: 3 },
  { name: 'モニター付き除細動器', quantity: 3, categoryId: 3 },
  { name: '気道管理トレーナー', quantity: 4, categoryId: 3 },
  { name: '気道管理セット', quantity: 1, categoryId: 3 },
  { name: '蘇生（点滴）セット', quantity: 1, categoryId: 3 },

  // トレーニング資機材 (categoryId: 2)
  { name: 'フェモララインマン', quantity: 1, categoryId: 2 },
  { name: '動脈注射トレーニングアーム', quantity: 1, categoryId: 2 },
  { name: '採血・静注シミュレータ シンジョー', quantity: 2, categoryId: 2 },
  { name: 'CVC穿刺挿入シミュレーター', quantity: 1, categoryId: 2 },
  { name: 'エンドワークプロII', quantity: 2, categoryId: 2 },
  { name: '心臓手術訓練用バイパス訓練装置', quantity: 1, categoryId: 2 },
  { name: '低侵襲心臓外科手術(MICS)訓練装置', quantity: 2, categoryId: 2 },
  { name: 'ANGIO-Mentor スリムデュアル', quantity: 1, categoryId: 2 },
  { name: 'ラップメンター', quantity: 1, categoryId: 2 },
  { name: '超音波トレーニングシミュレーター', quantity: 1, categoryId: 2 },
  { name: '経食道心エコー基本システム', quantity: 1, categoryId: 2 },
  { name: '超音波画像診断装置', quantity: 1, categoryId: 2 },
  { name: '上部消化管・ERCP研修モデル', quantity: 1, categoryId: 2 },
  { name: 'マイクロ実体顕微鏡システム', quantity: 1, categoryId: 2 },
  { name: 'PROMPT分娩介助教育トレーナー', quantity: 1, categoryId: 2 },
  { name: 'ソフィー産科シミュレーターセット', quantity: 1, categoryId: 2 },
  { name: 'インファントウォーマー', quantity: 1, categoryId: 2 },
  { name: '全身麻酔装置エスパイアViewPro一式', quantity: 1, categoryId: 2 },
  { name: 'Choking Charlie', quantity: 1, categoryId: 2 },
  { name: '女性導尿&浣腸シミュレーター', quantity: 1, categoryId: 2 },
  { name: '男性導尿&洗腸シミュレーター', quantity: 1, categoryId: 2 },

  // 機械類 (categoryId: 4)
  { name: '鑷子（ピンセット）', quantity: 1, categoryId: 4, description: 'クーパー' },
  { name: '鉗子', quantity: 1, categoryId: 4, description: '持針器' },
  { name: 'マイクロ鑷子', quantity: 1, categoryId: 4 },
  { name: 'マイクロ鉗子', quantity: 1, categoryId: 4 },
  { name: 'マイクロ持針器（止付）', quantity: 1, categoryId: 4 },
  { name: 'マイクロ外膜用直剪刀', quantity: 1, categoryId: 4 },
  { name: '切開用反剪刀', quantity: 1, categoryId: 4 },

  // 消耗品 (categoryId: 5)
  { name: '針', quantity: 1, categoryId: 5, description: '糸' },
  { name: 'スキンマーカー', quantity: 1, categoryId: 5, description: 'メス' },
  { name: '防水シート', quantity: 1, categoryId: 5, description: '手袋' },
  { name: '模擬血液', quantity: 1, categoryId: 5 },
];

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const equipmentRepo = AppDataSource.getRepository(Equipment);
    const categoryRepo = AppDataSource.getRepository(EquipmentCategory);

    for (const item of equipmentData) {
      // 既存チェック
      const existing = await equipmentRepo.findOne({ where: { name: item.name } });
      if (existing) {
        console.log(`Skip: ${item.name} (already exists)`);
        continue;
      }

      const category = await categoryRepo.findOne({ where: { id: item.categoryId } });
      
      const equipment = equipmentRepo.create({
        name: item.name,
        quantity: item.quantity,
        description: item.description || undefined,
        category: category || undefined,
        isActive: true
      });

      await equipmentRepo.save(equipment);
      console.log(`Created: ${item.name}`);
    }

    console.log('Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
