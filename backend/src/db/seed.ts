/**
 * Database seed script
 * Populates initial data for equipment categories and equipment
 */

import dotenv from 'dotenv';
import { query, pool } from './index.js';

dotenv.config();

interface CategoryData {
  name: string;
  description: string;
  sort_order: number;
}

interface EquipmentData {
  name: string;
  description: string;
  quantity: number;
  is_unlimited: boolean;
  category_key: string;
}

const categories: Record<string, CategoryData> = {
  av: {
    name: '映像・音響機器',
    description: 'プロジェクター、スクリーン、マイクなどの映像・音響機器',
    sort_order: 1,
  },
  pc: {
    name: 'PC・IT機器',
    description: 'ノートPC、タブレット、ネットワーク機器など',
    sort_order: 2,
  },
  office: {
    name: '事務用品',
    description: 'ホワイトボード、延長コードなどの事務用品',
    sort_order: 3,
  },
  furniture: {
    name: '什器・家具',
    description: 'テーブル、椅子、パーティションなど',
    sort_order: 4,
  },
  event: {
    name: 'イベント用品',
    description: 'テント、看板、受付用品など',
    sort_order: 5,
  },
  other: {
    name: 'その他',
    description: 'その他の資機材',
    sort_order: 99,
  },
};

const equipment: EquipmentData[] = [
  // 映像・音響機器
  { name: 'プロジェクター（大型）', description: '3000ルーメン以上の大型プロジェクター', quantity: 3, is_unlimited: false, category_key: 'av' },
  { name: 'プロジェクター（小型）', description: 'モバイルプロジェクター', quantity: 5, is_unlimited: false, category_key: 'av' },
  { name: 'スクリーン（100インチ）', description: '自立式100インチスクリーン', quantity: 3, is_unlimited: false, category_key: 'av' },
  { name: 'ワイヤレスマイク', description: 'ハンドヘルド型ワイヤレスマイク', quantity: 10, is_unlimited: false, category_key: 'av' },
  { name: 'ピンマイク', description: 'ワイヤレスピンマイク', quantity: 5, is_unlimited: false, category_key: 'av' },
  { name: 'スピーカー（PA）', description: 'ポータブルPAスピーカー', quantity: 4, is_unlimited: false, category_key: 'av' },
  { name: 'HDMIケーブル（5m）', description: '5メートルHDMIケーブル', quantity: 20, is_unlimited: false, category_key: 'av' },
  
  // PC・IT機器
  { name: 'ノートPC（Windows）', description: 'Windows 11搭載ノートPC', quantity: 10, is_unlimited: false, category_key: 'pc' },
  { name: 'ノートPC（Mac）', description: 'MacBook Pro', quantity: 5, is_unlimited: false, category_key: 'pc' },
  { name: 'タブレット（iPad）', description: 'iPad（第10世代）', quantity: 8, is_unlimited: false, category_key: 'pc' },
  { name: 'Wi-Fiルーター', description: 'モバイルWi-Fiルーター', quantity: 5, is_unlimited: false, category_key: 'pc' },
  { name: 'Webカメラ', description: 'フルHD対応Webカメラ', quantity: 10, is_unlimited: false, category_key: 'pc' },
  
  // 事務用品
  { name: 'ホワイトボード（大）', description: '1800x900mmホワイトボード', quantity: 5, is_unlimited: false, category_key: 'office' },
  { name: 'ホワイトボード（小）', description: '900x600mmホワイトボード', quantity: 10, is_unlimited: false, category_key: 'office' },
  { name: '延長コード（5m）', description: '5メートル延長コード', quantity: 30, is_unlimited: false, category_key: 'office' },
  { name: '電源タップ（6口）', description: '6口電源タップ', quantity: 20, is_unlimited: false, category_key: 'office' },
  { name: 'レーザーポインター', description: 'プレゼン用レーザーポインター', quantity: 10, is_unlimited: false, category_key: 'office' },
  
  // 什器・家具
  { name: '折りたたみテーブル', description: '1800x450mm折りたたみテーブル', quantity: 20, is_unlimited: false, category_key: 'furniture' },
  { name: '折りたたみ椅子', description: 'パイプ椅子', quantity: 100, is_unlimited: false, category_key: 'furniture' },
  { name: 'パーティション', description: '1800x900mmパーティション', quantity: 10, is_unlimited: false, category_key: 'furniture' },
  
  // イベント用品
  { name: 'テント（3x3m）', description: 'イベント用テント', quantity: 5, is_unlimited: false, category_key: 'event' },
  { name: '受付台', description: 'イベント受付用カウンター', quantity: 3, is_unlimited: false, category_key: 'event' },
  { name: 'A型看板', description: 'A1サイズA型看板', quantity: 10, is_unlimited: false, category_key: 'event' },
  
  // その他
  { name: '会議室（予約のみ）', description: '会議室の予約枠', quantity: 1, is_unlimited: true, category_key: 'other' },
];

async function seed(): Promise<void> {
  console.log('Starting database seed...');
  
  try {
    // Check if data already exists
    const existingCategories = await query<{ count: string }>('SELECT COUNT(*) as count FROM equipment_categories');
    if (parseInt(existingCategories.rows[0].count, 10) > 0) {
      console.log('Data already exists. Skipping seed.');
      return;
    }
    
    // Insert categories and build ID map
    const categoryIdMap: Record<string, string> = {};
    
    for (const [key, cat] of Object.entries(categories)) {
      const result = await query<{ id: string }>(
        `INSERT INTO equipment_categories (name, description, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [cat.name, cat.description, cat.sort_order]
      );
      categoryIdMap[key] = result.rows[0].id;
      console.log(`Created category: ${cat.name}`);
    }
    
    // Insert equipment
    for (const eq of equipment) {
      await query(
        `INSERT INTO equipment (name, description, quantity, is_unlimited, category_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [eq.name, eq.description, eq.quantity, eq.is_unlimited, categoryIdMap[eq.category_key]]
      );
      console.log(`Created equipment: ${eq.name}`);
    }
    
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

// Main execution
seed()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
