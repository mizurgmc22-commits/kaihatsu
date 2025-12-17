import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import equipmentRoutes from './routes/equipment.js';
import reservationRoutes from './routes/reservations.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

// Auth endpoint for getting current user info
app.get('/api/auth/me', async (req, res) => {
  const { verifyToken } = await import('./middleware/auth.js');
  const { query } = await import('./db/index.js');
  
  // Use verifyToken middleware inline
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '認証が必要です' });
    return;
  }
  
  try {
    const { admin } = await import('./middleware/auth.js');
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user from database
    const userResult = await query(
      `SELECT id, name, email, role, department, phone, is_active, last_login_at, created_at, updated_at
       FROM users WHERE firebase_uid = $1`,
      [decodedToken.uid]
    );
    
    if (userResult.rows.length === 0) {
      // User not in database yet, return basic info from token
      res.json({
        success: true,
        data: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: decodedToken.role || 'user',
          name: decodedToken.name || decodedToken.email,
        },
      });
      return;
    }
    
    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE firebase_uid = $1',
      [decodedToken.uid]
    );
    
    res.json({ success: true, data: userResult.rows[0] });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, error: '認証に失敗しました' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'エンドポイントが見つかりません' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'サーバーエラーが発生しました' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
