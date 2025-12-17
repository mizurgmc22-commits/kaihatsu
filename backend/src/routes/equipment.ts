import { Router, type Response } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';
import { optionalAuth, verifyToken, requireAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest, Equipment, EquipmentCategory, EquipmentWithCategory } from '../types/index.js';

const router = Router();

// Validation schemas
const createEquipmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  quantity: z.number().int().min(0).default(1),
  is_unlimited: z.boolean().default(false),
  location: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  specs: z.record(z.unknown()).optional(),
});

const updateEquipmentSchema = createEquipmentSchema.partial();

// GET /api/equipment - List all equipment (public)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category_id, include_inactive } = req.query;
    
    let sql = `
      SELECT e.*, c.name as category_name, c.description as category_description
      FROM equipment e
      LEFT JOIN equipment_categories c ON e.category_id = c.id
      WHERE e.is_deleted = false
    `;
    const params: unknown[] = [];
    
    // Only show active equipment for non-admin users
    if (!req.user || req.user.role !== 'admin' || include_inactive !== 'true') {
      sql += ` AND e.status = 'active'`;
    }
    
    if (category_id) {
      params.push(category_id);
      sql += ` AND e.category_id = $${params.length}`;
    }
    
    sql += ` ORDER BY c.sort_order, e.name`;
    
    const result = await query<Equipment & { category_name: string; category_description: string }>(sql, params);
    
    const equipment: EquipmentWithCategory[] = result.rows.map(row => ({
      id: row.id,
      category_id: row.category_id,
      name: row.name,
      description: row.description,
      quantity: row.quantity,
      is_unlimited: row.is_unlimited,
      location: row.location,
      image_file_id: row.image_file_id,
      status: row.status,
      specs: row.specs,
      is_deleted: row.is_deleted,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: row.category_description,
        sort_order: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    }));
    
    res.json({ success: true, data: equipment });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, error: '資機材の取得に失敗しました' });
  }
});

// GET /api/equipment/:id - Get single equipment (public)
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query<Equipment & { category_name: string; category_description: string }>(
      `SELECT e.*, c.name as category_name, c.description as category_description
       FROM equipment e
       LEFT JOIN equipment_categories c ON e.category_id = c.id
       WHERE e.id = $1 AND e.is_deleted = false`,
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '資機材が見つかりません' });
      return;
    }
    
    const row = result.rows[0];
    const equipment: EquipmentWithCategory = {
      ...row,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        description: row.category_description,
        sort_order: 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    };
    
    res.json({ success: true, data: equipment });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, error: '資機材の取得に失敗しました' });
  }
});

// POST /api/equipment - Create equipment (admin only)
router.post('/', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createEquipmentSchema.parse(req.body);
    
    const result = await query<Equipment>(
      `INSERT INTO equipment (name, description, quantity, is_unlimited, location, category_id, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.name, data.description, data.quantity, data.is_unlimited, data.location, data.category_id, JSON.stringify(data.specs || {})]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'バリデーションエラー', details: error.errors });
      return;
    }
    console.error('Error creating equipment:', error);
    res.status(500).json({ success: false, error: '資機材の作成に失敗しました' });
  }
});

// PUT /api/equipment/:id - Update equipment (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateEquipmentSchema.parse(req.body);
    
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      values.push(data.quantity);
    }
    if (data.is_unlimited !== undefined) {
      updates.push(`is_unlimited = $${paramIndex++}`);
      values.push(data.is_unlimited);
    }
    if (data.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(data.category_id);
    }
    if (data.specs !== undefined) {
      updates.push(`specs = $${paramIndex++}`);
      values.push(JSON.stringify(data.specs));
    }
    
    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '更新するフィールドがありません' });
      return;
    }
    
    values.push(id);
    
    const result = await query<Equipment>(
      `UPDATE equipment SET ${updates.join(', ')} WHERE id = $${paramIndex} AND is_deleted = false RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '資機材が見つかりません' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'バリデーションエラー', details: error.errors });
      return;
    }
    console.error('Error updating equipment:', error);
    res.status(500).json({ success: false, error: '資機材の更新に失敗しました' });
  }
});

// DELETE /api/equipment/:id - Soft delete equipment (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE equipment SET is_deleted = true WHERE id = $1 AND is_deleted = false RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: '資機材が見つかりません' });
      return;
    }
    
    res.json({ success: true, message: '資機材を削除しました' });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ success: false, error: '資機材の削除に失敗しました' });
  }
});

// GET /api/equipment/categories - List all categories (public)
router.get('/categories/list', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query<EquipmentCategory>(
      'SELECT * FROM equipment_categories ORDER BY sort_order, name'
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'カテゴリの取得に失敗しました' });
  }
});

// POST /api/equipment/categories - Create category (admin only)
router.post('/categories', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, sort_order } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'カテゴリ名は必須です' });
      return;
    }
    
    const result = await query<EquipmentCategory>(
      `INSERT INTO equipment_categories (name, description, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, sort_order || 0]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'カテゴリの作成に失敗しました' });
  }
});

export default router;
