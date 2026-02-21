import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { EQUIPMENT_IMAGE_DIR, EQUIPMENT_IMAGE_PUBLIC_PATH } from '../config/upload';
import {
  findAllEquipment,
  findEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  findAllCategories,
  findCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../repositories/equipmentRepository';

const equipmentRouter = Router();

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
    const { search, categoryId, isActive, page, limit } = req.query;

    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const { items, total } = await findAllEquipment({
      search: search as string | undefined,
      categoryId: categoryId as string | undefined,
      isActive: isActiveBool,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    const effectiveLimit = limit ? Number(limit) : total;
    const effectivePage = page ? Number(page) : 1;

    res.json({
      items,
      pagination: {
        page: effectivePage,
        limit: effectiveLimit,
        total,
        totalPages: effectiveLimit > 0 ? Math.ceil(total / effectiveLimit) : 1
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
    const equipment = await findEquipmentById(id);

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

    const file = (req as MulterRequest).file;
    // ファイルアップロード優先、なければGoogle Drive URLテキストを使用
    const imageUrl = file
      ? buildImageUrl(file.filename)
      : req.body.imageUrl || undefined;

    const saved = await createEquipment({
      name,
      description,
      quantity,
      location,
      specifications,
      imageUrl,
      isActive: true,
      categoryId: categoryId || undefined,
    });

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

    const existing = await findEquipmentById(id);

    if (!existing) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (location !== undefined) updateData.location = location;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (specifications !== undefined) updateData.specifications = specifications;

    // カテゴリ更新
    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === '' || categoryId === 'null') {
        updateData.categoryId = null;
      } else {
        updateData.categoryId = categoryId;
      }
    }

    const file = (req as MulterRequest).file;

    if (removeImage) {
      await removeImageFile(existing.imageUrl);
      updateData.imageUrl = null;
    }

    if (file) {
      // ファイルアップロードがある場合
      if (!removeImage) {
        await removeImageFile(existing.imageUrl);
      }
      updateData.imageUrl = buildImageUrl(file.filename);
    } else if (!removeImage && req.body.imageUrl !== undefined) {
      // Google Drive URLテキストが送信された場合
      updateData.imageUrl = req.body.imageUrl || null;
    }

    const saved = await updateEquipment(id, updateData);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// 資機材削除（論理削除扱いで無効化のみ）
equipmentRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await findEquipmentById(id);

    if (!existing) {
      return res.status(404).json({ message: '資機材が見つかりません' });
    }

    await deleteEquipment(id);
    res.json({ message: '資機材を無効化しました' });
  } catch (error) {
    next(error);
  }
});

// ========== カテゴリ CRUD ==========

// カテゴリ一覧取得
equipmentRouter.get('/categories/list', async (_req, res, next) => {
  try {
    const categories = await findAllCategories();

    // 表示順: 蘇生講習資機材 → トレーニング資機材 → 機械類 → 消耗品 → その他 → それ以外（名前順）
    const ORDER = ['蘇生講習資機材', 'トレーニング資機材', '機械類', '消耗品', 'その他'];

    const sorted = categories.sort((a, b) => {
      const ia = ORDER.indexOf(a.name);
      const ib = ORDER.indexOf(b.name);

      if (ia === -1 && ib === -1) {
        return a.name.localeCompare(b.name, 'ja');
      }
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    // 各カテゴリの資機材数を取得
    const result = await Promise.all(
      sorted.map(async (cat) => {
        const { total } = await findAllEquipment({ categoryId: cat.id });
        return {
          ...cat,
          equipmentCount: total,
        };
      })
    );

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
    const allCategories = await findAllCategories();
    const existing = allCategories.find((c) => c.name === name);
    if (existing) {
      return res.status(409).json({ message: '同名のカテゴリが既に存在します' });
    }

    const saved = await createCategory({ name, description });
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

    const category = await findCategoryById(id);
    if (!category) {
      return res.status(404).json({ message: 'カテゴリが見つかりません' });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const saved = await updateCategory(id, updateData);
    res.json(saved);
  } catch (error) {
    next(error);
  }
});

// カテゴリ削除
equipmentRouter.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await findCategoryById(id);

    if (!category) {
      return res.status(404).json({ message: 'カテゴリが見つかりません' });
    }

    // 資機材が紐づいている場合は削除不可
    const { total } = await findAllEquipment({ categoryId: id, includeDeleted: true });
    if (total > 0) {
      return res.status(400).json({
        message: 'このカテゴリには資機材が登録されているため削除できません'
      });
    }

    await deleteCategory(id);
    res.json({ message: 'カテゴリを削除しました' });
  } catch (error) {
    next(error);
  }
});

export default equipmentRouter;
