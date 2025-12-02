import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppDataSource from '../data-source';
import { User } from '../entity/User';

const authRouter = Router();
const userRepo = () => AppDataSource.getRepository(User);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// 認証ミドルウェア
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '認証が必要です' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    const user = await userRepo().findOne({ where: { id: decoded.userId, isActive: true } });

    if (!user) {
      return res.status(401).json({ message: 'ユーザーが見つかりません' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '無効なトークンです' });
  }
};

// 管理者ロールチェック
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

// 管理者一覧取得
authRouter.get(
  '/admins',
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await userRepo().find({
        where: [{ role: 'admin' }, { role: 'system_admin' }],
        order: { createdAt: 'DESC' }
      });

      res.json(
        admins.map((admin) => ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          department: admin.department,
          lastLoginAt: admin.lastLoginAt,
          createdAt: admin.createdAt
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
        return res
          .status(400)
          .json({ message: '名前、メールアドレス、パスワード、部署は必須です' });
      }

      const existingUser = await userRepo().findOne({
        where: { email: email.toLowerCase() }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'このメールアドレスは既に登録されています' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const adminUser = userRepo().create({
        name,
        email,
        password: hashedPassword,
        department,
        role: 'admin',
        isActive: true
      });

      const saved = await userRepo().save(adminUser);

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
      const adminId = Number(req.params.id);
      const requester = (req as any).user as User;

      if (Number.isNaN(adminId)) {
        return res.status(400).json({ message: '有効なIDを指定してください' });
      }

      if (requester.id === adminId) {
        return res.status(400).json({ message: '自分自身は削除できません' });
      }

      const adminUser = await userRepo().findOne({ where: { id: adminId } });

      if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'system_admin')) {
        return res.status(404).json({ message: '管理者が見つかりません' });
      }

      if (adminUser.role === 'system_admin' && requester.role !== 'system_admin') {
        return res.status(403).json({ message: 'システム管理者を削除する権限がありません' });
      }

      adminUser.isActive = false;
      adminUser.deletedAt = new Date();

      await userRepo().save(adminUser);

      res.json({ message: '管理者を削除しました' });
    } catch (error) {
      next(error);
    }
  }
);

export default authRouter;
