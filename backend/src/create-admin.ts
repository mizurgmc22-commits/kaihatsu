import bcrypt from 'bcryptjs';
import AppDataSource from './data-source';
import { User } from './entity/User';

async function createAdmin() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const userRepo = AppDataSource.getRepository(User);

  // 既存の管理者をチェック
  const existingAdmin = await userRepo.findOne({ 
    where: { email: 'admin@example.com' } 
  });

  if (existingAdmin) {
    console.log('管理者ユーザーは既に存在します');
    console.log('Email: admin@example.com');
    await AppDataSource.destroy();
    return;
  }

  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 管理者ユーザーを作成
  const admin = userRepo.create({
    name: '管理者',
    email: 'admin@example.com',
    password: hashedPassword,
    department: 'システム管理',
    role: 'admin',
    isActive: true
  });

  await userRepo.save(admin);

  console.log('管理者ユーザーを作成しました');
  console.log('================================');
  console.log('Email: admin@example.com');
  console.log('Password: admin123');
  console.log('================================');

  await AppDataSource.destroy();
}

createAdmin().catch(console.error);
