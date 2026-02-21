import admin from "firebase-admin";
import { db } from "../lib/firebase";

const userCollection = () => db.collection("users");

const Timestamp = admin.firestore.Timestamp;

export interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin" | "system_admin";
  department: string;
  phoneNumber?: string;
  extensionNumber?: string;
  isActive: boolean;
  lastLoginAt?: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  deletedAt?: admin.firestore.Timestamp;
}

function docToUser(
  doc: admin.firestore.DocumentSnapshot,
  includePassword = false
): UserData & { id: string } {
  const data = doc.data()!;
  const user: UserData & { id: string } = {
    id: doc.id,
    name: data.name || "",
    email: data.email || "",
    role: data.role || "user",
    department: data.department || "",
    phoneNumber: data.phoneNumber || undefined,
    extensionNumber: data.extensionNumber || undefined,
    isActive: data.isActive ?? true,
    lastLoginAt: data.lastLoginAt || undefined,
    createdAt: data.createdAt || undefined,
    updatedAt: data.updatedAt || undefined,
    deletedAt: data.deletedAt || undefined,
  };
  if (includePassword) {
    user.password = data.password || undefined;
  }
  return user;
}

// ---------- find ----------

export async function findUserByEmail(
  email: string,
  includePassword = false
): Promise<(UserData & { id: string }) | null> {
  const snapshot = await userCollection()
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return docToUser(snapshot.docs[0], includePassword);
}

export async function findUserById(
  id: string,
  includePassword = false
): Promise<(UserData & { id: string }) | null> {
  const doc = await userCollection().doc(id).get();
  if (!doc.exists) return null;
  return docToUser(doc, includePassword);
}

export async function findAdmins(): Promise<(UserData & { id: string })[]> {
  const snapshot = await userCollection()
    .where("role", "in", ["admin", "system_admin"])
    .get();

  return snapshot.docs
    .map((doc) => docToUser(doc))
    .filter((u) => !u.deletedAt);
}

export async function countActiveUsers(): Promise<number> {
  const snapshot = await userCollection()
    .where("isActive", "==", true)
    .get();
  return snapshot.size;
}

// ---------- create ----------

export async function createUser(
  data: Omit<UserData, "id" | "createdAt" | "updatedAt">
): Promise<UserData & { id: string }> {
  const now = Timestamp.now();
  const docRef = await userCollection().add({
    ...data,
    email: data.email.toLowerCase(),
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const created = await docRef.get();
  return docToUser(created);
}

// ---------- update ----------

export async function updateUser(
  id: string,
  data: Partial<UserData>
): Promise<(UserData & { id: string }) | null> {
  const docRef = userCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  if (data.email) {
    updateData.email = data.email.toLowerCase();
  }

  delete updateData.id;
  delete updateData.createdAt;

  await docRef.update(updateData);
  return findUserById(id);
}

// ---------- delete ----------

export async function softDeleteUser(id: string): Promise<boolean> {
  const docRef = userCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return false;

  await docRef.update({
    isActive: false,
    deletedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return true;
}
