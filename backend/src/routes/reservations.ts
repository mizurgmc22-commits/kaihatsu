import { Router, type Response } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';
import { optionalAuth, verifyToken, requireAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest, Reservation, ReservationWithRelations, ReservationStatus } from '../types/index.js';

const router = Router();

// Validation schemas
const createReservationSchema = z.object({
  equipment_id: z.string().uuid().optional(),
  custom_equipment_name: z.string().max(200).optional(),
  department: z.string().min(1).max(100),
  applicant_name: z.string().min(1).max(100),
  contact_info: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  quantity: z.number().int().min(1).default(1),
  purpose: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().optional(),
});

const updateReservationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
  department: z.string().min(1).max(100).optional(),
  applicant_name: z.string().min(1).max(100).optional(),
  contact_info: z.string().min(1).max(200).optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  quantity: z.number().int().min(1).optional(),
  purpose: z.string().optional(),
  location: z.string().max(200).optional(),
});

// GET /api/reservations - List reservations (public for viewing, filtered for non-admin)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { equipment_id, status, start_date, end_date, page = '1', limit = '50' } = req.query as Record<string, string>;
    
    let sql = `
      SELECT r.*, 
             e.name as equipment_name, e.description as equipment_description,
             u.name as user_name, u.email as user_email
      FROM reservations r
      LEFT JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;
    
    if (equipment_id) {
      sql += ` AND r.equipment_id = $${paramIndex++}`;
      params.push(equipment_id);
    }
    
    if (status) {
      const statuses = status.split(',') as ReservationStatus[];
      sql += ` AND r.status = ANY($${paramIndex++})`;
      params.push(statuses);
    }
    
    if (start_date) {
      sql += ` AND r.start_time >= $${paramIndex++}`;
      params.push(new Date(start_date));
    }
    
    if (end_date) {
      sql += ` AND r.end_time <= $${paramIndex++}`;
      params.push(new Date(end_date));
    }
    
    sql += ` ORDER BY r.start_time DESC`;
    
    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (pageNum - 1) * limitNum;
    
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offset);
    
    const result = await query<Reservation & {
      equipment_name: string;
      equipment_description: string;
      user_name: string;
      user_email: string;
    }>(sql, params);
    
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM reservations r WHERE 1=1`
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    const reservations: ReservationWithRelations[] = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      equipment_id: row.equipment_id,
      custom_equipment_name: row.custom_equipment_name,
      department: row.department,
      applicant_name: row.applicant_name,
      contact_info: row.contact_info,
      start_time: row.start_time,
      end_time: row.end_time,
      quantity: row.quantity,
      purpose: row.purpose,
      location: row.location,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      equipment: row.equipment_id ? {
        id: row.equipment_id,
        category_id: null,
        name: row.equipment_name,
        description: row.equipment_description,
        quantity: 0,
        is_unlimited: false,
        location: null,
        image_file_id: null,
        status: 'active',
        specs: {},
        is_deleted: false,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: 'user',
        department: null,
        phone: null,
        is_active: true,
        last_login_at: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : undefined,
    }));
    
    res.json({
      success: true,
      data: reservations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ success: false, error: '予約の取得に失敗しました' });
  }
});

// GET /api/reservations/:id - Get single reservation
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query<Reservation & {
      equipment_name: string;
      equipment_description: string;
      user_name: string;
      user_email: string;
    }>(
      `SELECT r.*, 
              e.name as equipment_name, e.description as equipment_description,
              u.name as user_name, u.email as user_email
       FROM reservations r
       LEFT JOIN equipment e ON r.equipment_id = e.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '予約が見つかりません' });
      return;
    }
    
    const row = result.rows[0];
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ success: false, error: '予約の取得に失敗しました' });
  }
});

// POST /api/reservations - Create reservation (public - no auth required)
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createReservationSchema.parse(req.body);
    
    // Validate equipment exists and check availability
    if (data.equipment_id) {
      const equipmentResult = await query<{ quantity: number; is_unlimited: boolean }>(
        'SELECT quantity, is_unlimited FROM equipment WHERE id = $1 AND is_deleted = false AND status = $2',
        [data.equipment_id, 'active']
      );
      
      if (equipmentResult.rows.length === 0) {
        res.status(400).json({ success: false, error: '指定された資機材が見つかりません' });
        return;
      }
      
      const equipment = equipmentResult.rows[0];
      
      // Check availability if not unlimited
      if (!equipment.is_unlimited) {
        const overlappingResult = await query<{ total_quantity: string }>(
          `SELECT COALESCE(SUM(quantity), 0) as total_quantity
           FROM reservations
           WHERE equipment_id = $1
             AND status NOT IN ('cancelled', 'rejected')
             AND start_time < $2
             AND end_time > $3`,
          [data.equipment_id, data.end_time, data.start_time]
        );
        
        const reservedQuantity = parseInt(overlappingResult.rows[0].total_quantity, 10);
        if (reservedQuantity + data.quantity > equipment.quantity) {
          res.status(400).json({ success: false, error: '在庫が不足しています' });
          return;
        }
      }
    }
    
    const result = await query<Reservation>(
      `INSERT INTO reservations (
        user_id, equipment_id, custom_equipment_name, department, applicant_name,
        contact_info, start_time, end_time, quantity, purpose, location, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.user?.userId || null,
        data.equipment_id || null,
        data.custom_equipment_name || null,
        data.department,
        data.applicant_name,
        data.contact_info,
        data.start_time,
        data.end_time,
        data.quantity,
        data.purpose || null,
        data.location || null,
        data.notes || null,
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'バリデーションエラー', details: error.errors });
      return;
    }
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, error: '予約の作成に失敗しました' });
  }
});

// PUT /api/reservations/:id - Update reservation (admin only for status changes)
router.put('/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateReservationSchema.parse(req.body);
    
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '更新するフィールドがありません' });
      return;
    }
    
    values.push(id);
    
    const result = await query<Reservation>(
      `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '予約が見つかりません' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'バリデーションエラー', details: error.errors });
      return;
    }
    console.error('Error updating reservation:', error);
    res.status(500).json({ success: false, error: '予約の更新に失敗しました' });
  }
});

// POST /api/reservations/:id/approve - Approve reservation (admin only)
router.post('/:id/approve', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query<Reservation>(
      `UPDATE reservations SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '予約が見つからないか、既に処理済みです' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0], message: '予約を承認しました' });
  } catch (error) {
    console.error('Error approving reservation:', error);
    res.status(500).json({ success: false, error: '予約の承認に失敗しました' });
  }
});

// POST /api/reservations/:id/reject - Reject reservation (admin only)
router.post('/:id/reject', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const result = await query<Reservation>(
      `UPDATE reservations SET status = 'rejected', notes = COALESCE($2, notes) WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id, notes]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '予約が見つからないか、既に処理済みです' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0], message: '予約を却下しました' });
  } catch (error) {
    console.error('Error rejecting reservation:', error);
    res.status(500).json({ success: false, error: '予約の却下に失敗しました' });
  }
});

// DELETE /api/reservations/:id - Cancel/delete reservation
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE reservations SET status = 'cancelled' WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: '予約が見つかりません' });
      return;
    }
    
    res.json({ success: true, message: '予約をキャンセルしました' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ success: false, error: '予約のキャンセルに失敗しました' });
  }
});

// GET /api/reservations/availability/:equipmentId - Check equipment availability
router.get('/availability/:equipmentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { equipmentId } = req.params;
    const { start_time, end_time } = req.query as Record<string, string>;
    
    if (!start_time || !end_time) {
      res.status(400).json({ success: false, error: 'start_time と end_time は必須です' });
      return;
    }
    
    const equipmentResult = await query<{ quantity: number; is_unlimited: boolean }>(
      'SELECT quantity, is_unlimited FROM equipment WHERE id = $1 AND is_deleted = false',
      [equipmentId]
    );
    
    if (equipmentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '資機材が見つかりません' });
      return;
    }
    
    const equipment = equipmentResult.rows[0];
    
    if (equipment.is_unlimited) {
      res.json({ success: true, data: { available: true, available_quantity: Infinity } });
      return;
    }
    
    const overlappingResult = await query<{ total_quantity: string }>(
      `SELECT COALESCE(SUM(quantity), 0) as total_quantity
       FROM reservations
       WHERE equipment_id = $1
         AND status NOT IN ('cancelled', 'rejected')
         AND start_time < $2
         AND end_time > $3`,
      [equipmentId, end_time, start_time]
    );
    
    const reservedQuantity = parseInt(overlappingResult.rows[0].total_quantity, 10);
    const availableQuantity = equipment.quantity - reservedQuantity;
    
    res.json({
      success: true,
      data: {
        available: availableQuantity > 0,
        available_quantity: Math.max(0, availableQuantity),
        total_quantity: equipment.quantity,
      },
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ success: false, error: '空き状況の確認に失敗しました' });
  }
});

export default router;
