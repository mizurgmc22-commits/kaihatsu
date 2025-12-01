import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import AppDataSource from './data-source';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import equipmentRouter from './routes/equipment';
import reservationRouter from './routes/reservation';

const app = express();
const PORT = process.env.PORT || 3002;

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

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

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
