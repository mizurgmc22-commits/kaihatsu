import express from "express";
import cors from "cors";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./lib/firebase";
import {
  findUserByEmail,
  createUser,
  updateUser,
} from "./repositories/userRepository";
import authRouter from "./routes/auth";
import dashboardRouter from "./routes/dashboard";
import topPageContentRouter from "./routes/topPageContent";
import equipmentRouter from "./routes/equipment";
import reservationRouter from "./routes/reservation";
import { UPLOADS_ROOT } from "./config/upload";

const app = express();
const PORT = process.env.PORT || 3002;
const DEFAULT_ADMIN_EMAIL = (
  process.env.DEFAULT_ADMIN_EMAIL || "admin@sazan-with.local"
).toLowerCase();
const DEFAULT_ADMIN_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD || "Sazan-Admin@2025";
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || "管理者";
const DEFAULT_ADMIN_DEPARTMENT =
  process.env.DEFAULT_ADMIN_DEPARTMENT || "システム管理";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/uploads", express.static(UPLOADS_ROOT));

app.use((req, _res, next) => {
  console.log("REQUEST", req.method, req.url);
  next();
});

app.get("/", (_req, res) => {
  res.json({ message: "資機材予約システムAPI" });
});

app.get("/api/debug-routes", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/top-page-content", topPageContentRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/reservations", reservationRouter);

// 404 Debug Handler
app.use((req, res, next) => {
  console.log("404 Hit:", req.method, req.url);
  res.status(404).json({ message: "Route not found", path: req.url });
});

async function ensureDefaultAdmin() {
  let admin = await findUserByEmail(DEFAULT_ADMIN_EMAIL, true);

  if (!admin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    admin = await createUser({
      name: DEFAULT_ADMIN_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      department: DEFAULT_ADMIN_DEPARTMENT,
      role: "admin",
      isActive: true,
    });
    console.log(`Default admin created (${DEFAULT_ADMIN_EMAIL})`);
    return;
  }

  let requiresUpdate = false;
  const updateData: Record<string, unknown> = {};

  if (!admin.isActive) {
    updateData.isActive = true;
    requiresUpdate = true;
  }

  if (admin.role !== "admin" && admin.role !== "system_admin") {
    updateData.role = "admin";
    requiresUpdate = true;
  }

  if (admin.password) {
    const passwordMatches = await bcrypt.compare(
      DEFAULT_ADMIN_PASSWORD,
      admin.password,
    );
    if (!passwordMatches) {
      updateData.password = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      requiresUpdate = true;
    }
  }

  if (admin.name !== DEFAULT_ADMIN_NAME) {
    updateData.name = DEFAULT_ADMIN_NAME;
    requiresUpdate = true;
  }

  if (admin.department !== DEFAULT_ADMIN_DEPARTMENT) {
    updateData.department = DEFAULT_ADMIN_DEPARTMENT;
    requiresUpdate = true;
  }

  if (requiresUpdate) {
    await updateUser(admin.id, updateData as any);
    console.log(`Default admin updated (${DEFAULT_ADMIN_EMAIL})`);
  } else {
    console.log(`Default admin already configured (${DEFAULT_ADMIN_EMAIL})`);
  }
}

async function startServer() {
  try {
    // Firebase接続確認
    console.log("Connecting to Firestore...");
    await db.listCollections();
    console.log("Firestore connected");

    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log("Server started at", new Date().toISOString());
    });
  } catch (error) {
    console.error("Firebase connection error:", error);
    process.exit(1);
  }
}

startServer();

export default app;
