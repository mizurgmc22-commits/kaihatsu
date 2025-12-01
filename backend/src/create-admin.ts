import bcrypt from 'bcryptjs';
import AppDataSource from './data-source';
import { User } from './entity/User';

async function createAdmin() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const userRepo = AppDataSource.getRepository(User);

  // 既存の管理者をチェック
  const existingAdmin = await userRepo.findOne({ 
    where: { email: 'admin@sazan-with.local' } 
  });

  if (existingAdmin) {
    console.log('管理者ユーザーは既に存在します');
    console.log('Email: admin@sazan-with.local');
    await AppDataSource.destroy();
    return;
  }

  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash('Sazan-Admin@2025', 10);

  // 管理者ユーザーを作成
  const admin = userRepo.create({
    name: '管理者',
    email: 'admin@sazan-with.local',
    password: hashedPassword,
    department: 'システム管理',
    role: 'admin',
    isActive: true
  });

  await userRepo.save(admin);

  console.log('管理者ユーザーを作成しました');
  console.log('================================');
  console.log('Email: admin@sazan-with.local');
  console.log('Password: Sazan-Admin@2025');
  console.log('================================');

  await AppDataSource.destroy();
}

createAdmin().catch(console.error);
