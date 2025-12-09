import { Router } from 'express';
import type { Request } from 'express';
import AppDataSource from '../data-source';
import { Equipment } from '../entity/Equipment';
import { EquipmentCategory } from '../entity/EquipmentCategory';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { EQUIPMENT_IMAGE_DIR, EQUIPMENT_IMAGE_PUBLIC_PATH } from '../config/upload';

const equipmentRouter = Router();
const equipmentRepo = () => AppDataSource.getRepository(Equipment);
const categoryRepo = () => AppDataSource.getRepository(EquipmentCategory);

type MulterRequest = Request & { file?: Express.Multer.File };

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, EQUIPMENT_IMAGE_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${timestamp}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('画像ファイルのみアップロードできます'));
    }
    cb(null, true);
  }
});

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return undefined;
};

const parseSpecifications = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const buildImageUrl = (filename: string) => `${EQUIPMENT_IMAGE_PUBLIC_PATH}/${filename}`;

const removeImageFile = async (imageUrl?: string | null) => {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(EQUIPMENT_IMAGE_DIR, filename);
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore
  }
};

// ========== 資機材 CRUD ==========

// 資機材一覧取得（フィルタ・検索対応）
equipmentRouter.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, isActive, page = 1, limit = 20 } = req.query;

    const queryBuilder = equipmentRepo()
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .where('equipment.isDeleted = :isDeleted', { isDeleted: false });

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

    // アクティブ状態フィルタ
    if (isActive === 'true') {
      queryBuilder.andWhere('equipment.isActive = :isActive', {
        isActive: true
      });
    } else if (isActive === 'false') {
      queryBuilder.andWhere('equipment.isActive = :isActive', {
        isActive: false
      });
    }
    // isActive が undefined や 'all' の場合は isDeleted=false のみでフィルタ

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
equipmentRouter.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, location, categoryId } = req.body;
    const quantity = toNumber(req.body.quantity);
    const specifications = parseSpecifications(req.body.specifications);

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

    const file = (req as MulterRequest).file;
    if (file) {
      equipment.imageUrl = buildImageUrl(file.filename);
    }

    // カテゴリ設定
    const parsedCategoryId = toNumber(categoryId);
    if (parsedCategoryId) {
      const category = await categoryRepo().findOne({ where: { id: parsedCategoryId } });
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
equipmentRouter.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, location, categoryId } = req.body;
    const quantity = toNumber(req.body.quantity);
    const isActive = toBoolean(req.body.isActive);
    const specifications = parseSpecifications(req.body.specifications);
    const removeImage = toBoolean(req.body.removeImage);

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
      if (categoryId === null || categoryId === '' || categoryId === 'null') {
        equipment.category = undefined;
      } else {
        const parsedCategoryId = toNumber(categoryId);
        if (parsedCategoryId) {
          const category = await categoryRepo().findOne({ where: { id: parsedCategoryId } });
          if (category) {
            equipment.category = category;
          }
        }
      }
    }

    const file = (req as MulterRequest).file;

    if (removeImage) {
      await removeImageFile(equipment.imageUrl);
      equipment.imageUrl = undefined;
    }

    if (file) {
      if (!removeImage) {
        await removeImageFile(equipment.imageUrl);
      }
      equipment.imageUrl = buildImageUrl(file.filename);
    }

    const saved = await equipmentRepo().save(equipment);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// 資機材削除（論理削除扱いで無効化のみ）
equipmentRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await equipmentRepo().findOne({ where: { id: Number(id) } });

    if (!equipment) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    // 論理削除扱い（レコードは保持し予約利用を止めるため非アクティブ化のみ）
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
      relations: ['equipments']
    });

    // 表示順: 蘇生講習資機材 → トレーニング資機材 → 機械類 → 消耗品 → その他 → それ以外（名前順）
    const ORDER = ['蘇生講習資機材', 'トレーニング資機材', '機械類', '消耗品', 'その他'];

    const sorted = categories.sort((a, b) => {
      const ia = ORDER.indexOf(a.name);
      const ib = ORDER.indexOf(b.name);

      if (ia === -1 && ib === -1) {
        // 両方とも定義外の場合は名前順
        return a.name.localeCompare(b.name, 'ja');
      }
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    // 各カテゴリの資機材数を追加
    const result = sorted.map((cat) => ({
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
