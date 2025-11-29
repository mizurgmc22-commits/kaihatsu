import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppDataSource from '../data-source';
import { User } from '../entity/User';

const authRouter = Router();
const userRepo = () => AppDataSource.getRepository(User);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ログイン
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードは必須です' });
    }

    // パスワード付きでユーザー取得
    const user = await userRepo()
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // 最終ログイン日時を更新
    user.lastLoginAt = new Date();
    await userRepo().save(user);

    // JWTトークン生成
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
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
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await userRepo().findOne({ 
        where: { id: decoded.userId, isActive: true } 
      });

      if (!user) {
        return res.status(401).json({ message: 'ユーザーが見つかりません' });
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
      return res.status(400).json({ message: '名前、メールアドレス、パスワード、部署は必須です' });
    }

    // 既存ユーザーチェック
    const existingUser = await userRepo().findOne({ 
      where: { email: email.toLowerCase() } 
    });
    if (existingUser) {
      return res.status(400).json({ message: 'このメールアドレスは既に登録されています' });
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepo().create({
      name,
      email,
      password: hashedPassword,
      department,
      role,
      isActive: true
    });

    const saved = await userRepo().save(user);

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

export default authRouter;

// 認証ミドルウェア
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '認証が必要です' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'トークンが無効です' });
  }
};

// 管理者チェックミドルウェア
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
    return res.status(403).json({ message: '管理者権限が必要です' });
  }
  next();
};
