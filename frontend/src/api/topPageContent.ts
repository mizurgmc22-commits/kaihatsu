import { apiClient } from "./client";

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

// 公開コンテンツ取得（認証不要）
export const getPublicTopPageContent = async (): Promise<
  DashboardContent[]
> => {
  const res = await apiClient.get("/top-page-content");
  return res.data;
};

// 管理用コンテンツ取得（認証必須）
export const getAdminTopPageContent = async (): Promise<DashboardContent[]> => {
  const res = await apiClient.get("/top-page-content/admin");
  return res.data;
};

// コンテンツ作成
export const createTopPageContent = async (
  input: CreateContentInput,
): Promise<DashboardContent> => {
  const res = await apiClient.post("/top-page-content", input);
  return res.data;
};

// コンテンツ更新
export const updateTopPageContent = async (
  id: string,
  input: UpdateContentInput,
): Promise<DashboardContent> => {
  const res = await apiClient.put(`/top-page-content/${id}`, input);
  return res.data;
};

// コンテンツ削除
export const deleteTopPageContent = async (id: string): Promise<void> => {
  await apiClient.delete(`/top-page-content/${id}`);
};

// ファイルアップロード
export const uploadTopPageFile = async (
  file: File,
): Promise<{ fileUrl: string; filename: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post(
    "/top-page-content/upload-file",
    formData,
    {
      headers: {
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
  await apiClient.put(
    "/top-page-content/reorder/bulk",
    { items },
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
