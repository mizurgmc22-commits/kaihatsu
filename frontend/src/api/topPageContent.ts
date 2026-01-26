import axios from "axios";

const API_BASE = "/api";

export interface DashboardContent {
  id: string;
  type: "announcement" | "guide" | "flow" | "pdf" | "link";
  title: string;
  content: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentInput {
  type: DashboardContent["type"];
  title: string;
  content?: string;
  fileUrl?: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateContentInput {
  type?: DashboardContent["type"];
  title?: string;
  content?: string | null;
  fileUrl?: string | null;
  linkUrl?: string | null;
  order?: number;
  isActive?: boolean;
}

import { auth } from "../lib/firebase";

// 認証トークン取得
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 公開コンテンツ取得（認証不要）
export const getPublicTopPageContent = async (): Promise<
  DashboardContent[]
> => {
  const res = await axios.get(`${API_BASE}/top-page-content`);
  return res.data;
};

// 管理用コンテンツ取得（認証必須）
export const getAdminTopPageContent = async (): Promise<DashboardContent[]> => {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${API_BASE}/top-page-content/admin`, {
    headers,
  });
  return res.data;
};

// コンテンツ作成
export const createTopPageContent = async (
  input: CreateContentInput,
): Promise<DashboardContent> => {
  const headers = await getAuthHeaders();
  const res = await axios.post(`${API_BASE}/top-page-content`, input, {
    headers,
  });
  return res.data;
};

// コンテンツ更新
export const updateTopPageContent = async (
  id: string,
  input: UpdateContentInput,
): Promise<DashboardContent> => {
  const headers = await getAuthHeaders();
  const res = await axios.put(`${API_BASE}/top-page-content/${id}`, input, {
    headers,
  });
  return res.data;
};

// コンテンツ削除
export const deleteTopPageContent = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`${API_BASE}/top-page-content/${id}`, {
    headers,
  });
};

// ファイルアップロード
export const uploadTopPageFile = async (
  file: File,
): Promise<{ fileUrl: string; filename: string }> => {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(
    `${API_BASE}/top-page-content/upload-file`,
    formData,
    {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data;
};

// 順序一括更新
export const reorderTopPageContent = async (
  items: { id: string; order: number }[],
): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.put(
    `${API_BASE}/top-page-content/reorder/bulk`,
    { items },
    {
      headers,
    },
  );
};

// コンテンツタイプのラベル
export const contentTypeLabels: Record<DashboardContent["type"], string> = {
  announcement: "お知らせ",
  guide: "使い方ガイド",
  flow: "予約フロー",
  pdf: "PDFファイル",
  link: "外部リンク",
};
