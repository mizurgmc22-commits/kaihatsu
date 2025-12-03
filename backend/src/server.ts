import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import AppDataSource from './data-source';
import { User } from './entity/User';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import equipmentRouter from './routes/equipment';
import reservationRouter from './routes/reservation';

const app = express();
const PORT = process.env.PORT || 3002;
const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@sazan-with.local').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Sazan-Admin@2025';
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || '管理者';
const DEFAULT_ADMIN_DEPARTMENT = process.env.DEFAULT_ADMIN_DEPARTMENT || 'システム管理';

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log('REQUEST', req.method, req.url);
  next();
});

app.get('/', (_req, res) => {
  res.json({ message: '資機材予約システムAPI' });
});

app.get('/api/debug-routes', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/reservations', reservationRouter);

async function ensureDefaultAdmin() {
  const userRepo = AppDataSource.getRepository(User);

  let admin = await userRepo
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.email = :email', { email: DEFAULT_ADMIN_EMAIL })
    .getOne();

  if (!admin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    admin = userRepo.create({
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      department: DEFAULT_ADMIN_DEPARTMENT,
      role: 'admin',
      isActive: true
    });
    await userRepo.save(admin);
    console.log(`Default admin created (${DEFAULT_ADMIN_EMAIL})`);
    return;
  }

  let requiresUpdate = false;

  if (!admin.isActive) {
    admin.isActive = true;
    requiresUpdate = true;
  }

  if (admin.role !== 'admin' && admin.role !== 'system_admin') {
    admin.role = 'admin';
    requiresUpdate = true;
  }

  const passwordMatches = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, admin.password);
  if (!passwordMatches) {
    admin.password = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    requiresUpdate = true;
  }

  if (admin.name !== DEFAULT_ADMIN_NAME) {
    admin.name = DEFAULT_ADMIN_NAME;
    requiresUpdate = true;
  }

  if (admin.department !== DEFAULT_ADMIN_DEPARTMENT) {
    admin.department = DEFAULT_ADMIN_DEPARTMENT;
    requiresUpdate = true;
  }

  if (requiresUpdate) {
    await userRepo.save(admin);
    console.log(`Default admin updated (${DEFAULT_ADMIN_EMAIL})`);
  } else {
    console.log(`Default admin already configured (${DEFAULT_ADMIN_EMAIL})`);
  }
}

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

startServer();

export default app;
