import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import AppDataSource from "../data-source";
import { DashboardContent, ContentType } from "../entity/DashboardContent";
import {
  DASHBOARD_FILE_DIR,
  DASHBOARD_FILE_PUBLIC_PATH,
} from "../config/upload";

const contentRouter = Router();
const contentRepo = () => AppDataSource.getRepository(DashboardContent);

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, DASHBOARD_FILE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeName = baseName.replace(
      /[^a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g,
      "_",
    );
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("許可されていないファイル形式です"));
    }
  },
});

// 簡易認証ミドルウェア（実際のプロジェクトではauthRouterのものを使用）
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "認証が必要です" });
  }
  next();
};

// 公開コンテンツ一覧取得（認証不要）
contentRouter.get(
  "/",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const contents = await contentRepo().find({
        where: { isActive: true },
        order: { type: "ASC", order: "ASC" },
      });
      res.json(contents);
    } catch (error) {
      next(error);
    }
  },
);

// 管理用コンテンツ一覧取得（認証必須）
contentRouter.get(
  "/admin",
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const contents = await contentRepo().find({
        order: { type: "ASC", order: "ASC" },
      });
      res.json(contents);
    } catch (error) {
      next(error);
    }
  },
);

// コンテンツ作成（認証必須）
contentRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Creating top page content:", req.body);
      const { type, title, content, fileUrl, linkUrl, order, isActive } =
        req.body;

      if (!type || !title) {
        return res.status(400).json({ message: "type と title は必須です" });
      }

      if (!Object.values(ContentType).includes(type)) {
        return res.status(400).json({ message: "無効なコンテンツタイプです" });
      }

      const newContent = contentRepo().create({
        type,
        title,
        content: content || null,
        fileUrl: fileUrl || null,
        linkUrl: linkUrl || null,
        order: order ?? 0,
        isActive: isActive ?? true,
      });

      const saved = await contentRepo().save(newContent);
      res.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  },
);

// コンテンツ更新（認証必須）
contentRouter.put(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await contentRepo().findOne({ where: { id } });

      if (!existing) {
        return res.status(404).json({ message: "コンテンツが見つかりません" });
      }

      const { type, title, content, fileUrl, linkUrl, order, isActive } =
        req.body;

      if (type !== undefined) existing.type = type;
      if (title !== undefined) existing.title = title;
      if (content !== undefined) existing.content = content;
      if (fileUrl !== undefined) existing.fileUrl = fileUrl;
      if (linkUrl !== undefined) existing.linkUrl = linkUrl;
      if (order !== undefined) existing.order = order;
      if (isActive !== undefined) existing.isActive = isActive;

      const updated = await contentRepo().save(existing);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// コンテンツ削除（認証必須）
contentRouter.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await contentRepo().findOne({ where: { id } });

      if (!existing) {
        return res.status(404).json({ message: "コンテンツが見つかりません" });
      }

      await contentRepo().remove(existing);
      res.json({ message: "削除しました" });
    } catch (error) {
      next(error);
    }
  },
);

// ファイルアップロード（認証必須）
contentRouter.post(
  "/upload-file",
  requireAuth,
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "ファイルがアップロードされていません" });
    }
    const fileUrl = `${DASHBOARD_FILE_PUBLIC_PATH}/${req.file.filename}`;
    res.json({ fileUrl, filename: req.file.originalname });
  },
);

// 順序一括更新（認証必須）
contentRouter.put(
  "/reorder/bulk",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body; // [{ id, order }]

      if (!Array.isArray(items)) {
        return res
          .status(400)
          .json({ message: "items は配列である必要があります" });
      }

      for (const item of items) {
        await contentRepo().update(item.id, { order: item.order });
      }

      res.json({ message: "順序を更新しました" });
    } catch (error) {
      next(error);
    }
  },
);

export default contentRouter;
