import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserById,
  findAdmins,
  createUser,
  updateUser,
  softDeleteUser,
} from '../repositories/userRepository';

const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 認証ミドルウェア
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await findUserById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'ユーザーが無効です' });
    }

    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'トークンが無効です' });
  }
};

// 管理者ロールチェック
const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
    return res.status(403).json({ message: '管理者権限が必要です' });
  }
  next();
};

// ログイン
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードは必須です' });
    }

    // パスワード付きでユーザー取得
    const user = await findUserByEmail(email, true);
    if (!user || !user.password) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'アカウントが無効化されています' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // 最終ログイン日時更新
    await updateUser(user.id, { lastLoginAt: new Date() as any });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
});

// 現在のユーザー情報取得
authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await findUserById(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: 'ユーザーが見つかりません' });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      });
    } catch {
      return res.status(401).json({ message: 'トークンが無効です' });
    }
  } catch (error) {
    next(error);
  }
});

// 管理者用: ユーザー登録
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, department, role = 'user' } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: '全項目の入力が必要です' });
    }

    // 重複チェック
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'このメールアドレスは既に使用されています' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const saved = await createUser({
      name,
      email,
      password: hashedPassword,
      department,
      role,
      isActive: true,
    });

    res.status(201).json({
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      department: saved.department
    });
  } catch (error) {
    next(error);
  }
});

// 管理者一覧取得
authRouter.get(
  '/admins',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await findAdmins();

      res.json(
        admins.map((admin) => ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          department: admin.department,
          lastLoginAt: admin.lastLoginAt
            ? (admin.lastLoginAt as any).toDate?.()?.toISOString?.() || admin.lastLoginAt
            : undefined,
          createdAt: admin.createdAt
            ? (admin.createdAt as any).toDate?.()?.toISOString?.() || admin.createdAt
            : undefined,
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

// 管理者登録
authRouter.post(
  '/admins',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, department } = req.body;

      if (!name || !email || !password || !department) {
        return res.status(400).json({ message: '全項目の入力が必要です' });
      }

      // 重複チェック
      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'このメールアドレスは既に使用されています' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const saved = await createUser({
        name,
        email,
        password: hashedPassword,
        department,
        role: 'admin',
        isActive: true,
      });

      res.status(201).json({
        id: saved.id,
        name: saved.name,
        email: saved.email,
        role: saved.role,
        department: saved.department
      });
    } catch (error) {
      next(error);
    }
  }
);

// 管理者削除
authRouter.delete(
  '/admins/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.params.id;
      const requester = (req as any).user;

      if (requester.id === adminId) {
        return res.status(400).json({ message: '自分自身は削除できません' });
      }

      const adminUser = await findUserById(adminId);
      if (!adminUser) {
        return res.status(404).json({ message: '管理者が見つかりません' });
      }

      if (adminUser.role !== 'admin' && adminUser.role !== 'system_admin') {
        return res.status(400).json({ message: '指定されたユーザーは管理者ではありません' });
      }

      await softDeleteUser(adminId);

      res.json({ message: '管理者を削除しました' });
    } catch (error) {
      next(error);
    }
  }
);

export default authRouter;
