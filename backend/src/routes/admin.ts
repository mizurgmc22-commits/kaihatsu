import { Router, type Response } from 'express';
import { query } from '../db/index.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest, Reservation, User } from '../types/index.js';

const router = Router();

// All routes require admin authentication
router.use(verifyToken, requireAdmin);

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Get counts
    const [
      pendingReservations,
      todayReservations,
      activeEquipment,
      totalUsers,
    ] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM reservations WHERE DATE(start_time) = CURRENT_DATE`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM equipment WHERE status = 'active' AND is_deleted = false`),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM users WHERE is_active = true`),
    ]);
    
    // Get recent reservations
    const recentReservations = await query<Reservation>(
      `SELECT r.*, e.name as equipment_name
       FROM reservations r
       LEFT JOIN equipment e ON r.equipment_id = e.id
       ORDER BY r.created_at DESC
       LIMIT 10`
    );
    
    // Get reservation stats by status
    const statusStats = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM reservations GROUP BY status`
    );
    
    res.json({
      success: true,
      data: {
        counts: {
          pending_reservations: parseInt(pendingReservations.rows[0].count, 10),
          today_reservations: parseInt(todayReservations.rows[0].count, 10),
          active_equipment: parseInt(activeEquipment.rows[0].count, 10),
          total_users: parseInt(totalUsers.rows[0].count, 10),
        },
        recent_reservations: recentReservations.rows,
        status_stats: statusStats.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count, 10);
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'ダッシュボードの取得に失敗しました' });
  }
});

// GET /api/admin/users - List all users
router.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query<Omit<User, 'firebase_uid'>>(
      `SELECT id, name, email, role, department, phone, is_active, last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'ユーザーの取得に失敗しました' });
  }
});

// POST /api/admin/users - Create user
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, role, department, phone, firebase_uid } = req.body;
    
    if (!name || !email) {
      res.status(400).json({ success: false, error: '名前とメールアドレスは必須です' });
      return;
    }
    
    const result = await query<User>(
      `INSERT INTO users (name, email, role, department, phone, firebase_uid)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, department, phone, is_active, created_at, updated_at`,
      [name, email, role || 'user', department, phone, firebase_uid]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'ユーザーの作成に失敗しました' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, department, phone, is_active } = req.body;
    
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(department);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    
    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '更新するフィールドがありません' });
      return;
    }
    
    values.push(id);
    
    const result = await query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, email, role, department, phone, is_active, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'ユーザーが見つかりません' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'ユーザーの更新に失敗しました' });
  }
});

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { table_name, action, limit = '100' } = req.query as Record<string, string>;
    
    let sql = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;
    
    if (table_name) {
      sql += ` AND al.table_name = $${paramIndex++}`;
      params.push(table_name);
    }
    
    if (action) {
      sql += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    
    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));
    
    const result = await query(sql, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: '監査ログの取得に失敗しました' });
  }
});

// GET /api/admin/export/reservations - Export reservations as JSON
router.get('/export/reservations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query as Record<string, string>;
    
    let sql = `
      SELECT r.*, e.name as equipment_name, u.name as user_name
      FROM reservations r
      LEFT JOIN equipment e ON r.equipment_id = e.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;
    
    if (start_date) {
      sql += ` AND r.start_time >= $${paramIndex++}`;
      params.push(new Date(start_date));
    }
    
    if (end_date) {
      sql += ` AND r.end_time <= $${paramIndex++}`;
      params.push(new Date(end_date));
    }
    
    sql += ` ORDER BY r.start_time DESC`;
    
    const result = await query(sql, params);
    
    if (format === 'csv') {
      // Simple CSV export
      const headers = ['ID', '資機材', '申請者', '部署', '開始日時', '終了日時', '数量', 'ステータス'];
      const rows = result.rows.map((r: Record<string, unknown>) => [
        r.id,
        r.equipment_name || r.custom_equipment_name,
        r.applicant_name,
        r.department,
        r.start_time,
        r.end_time,
        r.quantity,
        r.status,
      ].join(','));
      
      const csv = [headers.join(','), ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=reservations.csv');
      res.send('\uFEFF' + csv); // BOM for Excel
    } else {
      res.json({ success: true, data: result.rows });
    }
  } catch (error) {
    console.error('Error exporting reservations:', error);
    res.status(500).json({ success: false, error: 'エクスポートに失敗しました' });
  }
});

export default router;
