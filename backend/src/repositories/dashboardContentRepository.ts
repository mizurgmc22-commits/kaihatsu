import admin from "firebase-admin";
import { db } from "../lib/firebase";

const contentCollection = () => db.collection("dashboardContent");

const Timestamp = admin.firestore.Timestamp;

export interface DashboardContentData {
  id?: string;
  type: string; // "announcement" | "guide" | "flow" | "pdf" | "link"
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  linkUrl?: string | null;
  order: number;
  isActive: boolean;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

function docToContent(
  doc: admin.firestore.DocumentSnapshot
): DashboardContentData & { id: string } {
  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type || "",
    title: data.title || "",
    content: data.content ?? null,
    fileUrl: data.fileUrl ?? null,
    linkUrl: data.linkUrl ?? null,
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ---------- find ----------

export async function findActiveContent(): Promise<
  (DashboardContentData & { id: string })[]
> {
  // 複合インデックスを避けるため全件取得し、アプリケーション側でフィルタ・ソート
  const snapshot = await contentCollection().get();
  return snapshot.docs
    .map(docToContent)
    .filter((c) => c.isActive)
    .sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type);
      if (typeCompare !== 0) return typeCompare;
      return a.order - b.order;
    });
}

export async function findAllContent(): Promise<
  (DashboardContentData & { id: string })[]
> {
  const snapshot = await contentCollection().get();
  return snapshot.docs
    .map(docToContent)
    .sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type);
      if (typeCompare !== 0) return typeCompare;
      return a.order - b.order;
    });
}

export async function findContentById(
  id: string
): Promise<(DashboardContentData & { id: string }) | null> {
  const doc = await contentCollection().doc(id).get();
  if (!doc.exists) return null;
  return docToContent(doc);
}

// ---------- create ----------

export async function createContent(
  data: Omit<DashboardContentData, "id" | "createdAt" | "updatedAt">
): Promise<DashboardContentData & { id: string }> {
  const now = Timestamp.now();
  const docRef = await contentCollection().add({
    ...data,
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const created = await docRef.get();
  return docToContent(created);
}

// ---------- update ----------

export async function updateContent(
  id: string,
  data: Partial<DashboardContentData>
): Promise<(DashboardContentData & { id: string }) | null> {
  const docRef = contentCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  delete updateData.id;
  delete updateData.createdAt;

  await docRef.update(updateData);
  const updated = await docRef.get();
  return docToContent(updated);
}

export async function updateContentOrder(
  items: { id: string; order: number }[]
): Promise<void> {
  const batch = db.batch();
  for (const item of items) {
    const docRef = contentCollection().doc(item.id);
    batch.update(docRef, {
      order: item.order,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

// ---------- delete ----------

export async function deleteContent(id: string): Promise<boolean> {
  const docRef = contentCollection().doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return false;
  await docRef.delete();
  return true;
}
