import { Router } from 'express';
import AppDataSource from '../data-source';
import { Equipment } from '../entity/Equipment';
import { EquipmentCategory } from '../entity/EquipmentCategory';
import { Like } from 'typeorm';

const equipmentRouter = Router();
const equipmentRepo = () => AppDataSource.getRepository(Equipment);
const categoryRepo = () => AppDataSource.getRepository(EquipmentCategory);

// ========== 資機材 CRUD ==========

// 資機材一覧取得（フィルタ・検索対応）
equipmentRouter.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, isActive, page = 1, limit = 20 } = req.query;

    const queryBuilder = equipmentRepo()
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.category', 'category');

    // 検索フィルタ
    if (search) {
      queryBuilder.andWhere(
        '(equipment.name LIKE :search OR equipment.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // カテゴリフィルタ
    if (categoryId) {
      queryBuilder.andWhere('equipment.categoryId = :categoryId', {
        categoryId: Number(categoryId)
      });
    }

    // アクティブ状態フィルタ（デフォルトはアクティブのみ）
    if (isActive === undefined || isActive === 'true') {
      queryBuilder.andWhere('equipment.isActive = :isActive', {
        isActive: true
      });
    } else if (isActive === 'false') {
      queryBuilder.andWhere('equipment.isActive = :isActive', {
        isActive: false
      });
    }
    // isActive === 'all' の場合はフィルタなし

    // ページネーション
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    // 並び順
    queryBuilder.orderBy('equipment.name', 'ASC');

    const [items, total] = await queryBuilder.getManyAndCount();

    res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 資機材詳細取得
equipmentRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await equipmentRepo().findOne({
      where: { id: Number(id) },
      relations: ['category', 'reservations']
    });

    if (!equipment) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// 資機材作成
equipmentRouter.post('/', async (req, res, next) => {
  try {
    const { name, description, quantity, location, categoryId, specifications } = req.body;

    if (!name || quantity === undefined) {
      return res.status(400).json({ message: '名称と保有数は必須です' });
    }

    const equipment = equipmentRepo().create({
      name,
      description,
      quantity,
      location,
      specifications
    });

    // カテゴリ設定
    if (categoryId) {
      const category = await categoryRepo().findOne({ where: { id: categoryId } });
      if (category) {
        equipment.category = category;
      }
    }

    const saved = await equipmentRepo().save(equipment);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

// 資機材更新
equipmentRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, location, isActive, categoryId, specifications } = req.body;

    const equipment = await equipmentRepo().findOne({
      where: { id: Number(id) },
      relations: ['category']
    });

    if (!equipment) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    // 更新フィールド
    if (name !== undefined) equipment.name = name;
    if (description !== undefined) equipment.description = description;
    if (quantity !== undefined) equipment.quantity = quantity;
    if (location !== undefined) equipment.location = location;
    if (isActive !== undefined) equipment.isActive = isActive;
    if (specifications !== undefined) equipment.specifications = specifications;

    // カテゴリ更新
    if (categoryId !== undefined) {
      if (categoryId === null) {
        equipment.category = undefined;
      } else {
        const category = await categoryRepo().findOne({ where: { id: categoryId } });
        if (category) {
          equipment.category = category;
        }
      }
    }

    const saved = await equipmentRepo().save(equipment);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// 資機材削除（論理削除）
equipmentRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await equipmentRepo().findOne({ where: { id: Number(id) } });

    if (!equipment) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    // 論理削除（isActiveをfalseに）
    equipment.isActive = false;
    await equipmentRepo().save(equipment);

    res.json({ message: '資機材を無効化しました' });
  } catch (error) {
    next(error);
  }
});

// ========== カテゴリ CRUD ==========

// カテゴリ一覧取得
equipmentRouter.get('/categories/list', async (_req, res, next) => {
  try {
    const categories = await categoryRepo().find({
      relations: ['equipments'],
      order: { name: 'ASC' }
    });

    // 各カテゴリの資機材数を追加
    const result = categories.map((cat) => ({
      ...cat,
      equipmentCount: cat.equipments?.length || 0,
      equipments: undefined // 詳細は含めない
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// カテゴリ作成
equipmentRouter.post('/categories', async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'カテゴリ名は必須です' });
    }

    // 重複チェック
    const existing = await categoryRepo().findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: '同名のカテゴリが既に存在します' });
    }

    const category = categoryRepo().create({ name, description });
    const saved = await categoryRepo().save(category);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

// カテゴリ更新
equipmentRouter.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await categoryRepo().findOne({ where: { id: Number(id) } });

    if (!category) {
      return res.status(404).json({ message: 'カテゴリが見つかりません' });
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;

    const saved = await categoryRepo().save(category);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// カテゴリ削除
equipmentRouter.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryRepo().findOne({
      where: { id: Number(id) },
      relations: ['equipments']
    });

    if (!category) {
      return res.status(404).json({ message: 'カテゴリが見つかりません' });
    }

    // 資機材が紐づいている場合は削除不可
    if (category.equipments && category.equipments.length > 0) {
      return res.status(400).json({
        message: 'このカテゴリには資機材が登録されているため削除できません'
      });
    }

    await categoryRepo().remove(category);
    res.json({ message: 'カテゴリを削除しました' });
  } catch (error) {
    next(error);
  }
});

export default equipmentRouter;
