import { Router, type Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest, FileRecord } from '../types/index.js';

const router = Router();

// Initialize GCS client
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'equipment-booking-files';

// POST /api/files/upload-url - Get signed URL for upload (admin only)
router.post('/upload-url', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || !contentType) {
      res.status(400).json({ success: false, error: 'filename と contentType は必須です' });
      return;
    }
    
    // Generate unique file path
    const fileId = uuidv4();
    const extension = filename.split('.').pop() || '';
    const gcsPath = `equipment/${fileId}.${extension}`;
    
    // Get signed URL for upload
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsPath);
    
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });
    
    // Create file record in database
    const result = await query<FileRecord>(
      `INSERT INTO files (id, gcs_path, original_name, mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fileId, gcsPath, filename, contentType, req.user?.userId || null]
    );
    
    res.json({
      success: true,
      data: {
        file_id: fileId,
        upload_url: signedUrl,
        gcs_path: gcsPath,
        file: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ success: false, error: 'アップロードURLの生成に失敗しました' });
  }
});

// POST /api/files/:id/complete - Mark upload as complete and update size
router.post('/:id/complete', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { size_bytes } = req.body;
    
    const result = await query<FileRecord>(
      `UPDATE files SET size_bytes = $1 WHERE id = $2 RETURNING *`,
      [size_bytes || 0, id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error completing upload:', error);
    res.status(500).json({ success: false, error: 'アップロード完了処理に失敗しました' });
  }
});

// GET /api/files/:id/download-url - Get signed URL for download (public)
router.get('/:id/download-url', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query<FileRecord>(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
      return;
    }
    
    const fileRecord = result.rows[0];
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileRecord.gcs_path);
    
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    
    res.json({
      success: true,
      data: {
        download_url: signedUrl,
        file: fileRecord,
      },
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ success: false, error: 'ダウンロードURLの生成に失敗しました' });
  }
});

// DELETE /api/files/:id - Delete file (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await query<FileRecord>(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
      return;
    }
    
    const fileRecord = result.rows[0];
    
    // Delete from GCS
    try {
      const bucket = storage.bucket(bucketName);
      await bucket.file(fileRecord.gcs_path).delete();
    } catch (gcsError) {
      console.warn('Failed to delete file from GCS:', gcsError);
      // Continue with database deletion even if GCS deletion fails
    }
    
    // Delete from database
    await query('DELETE FROM files WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'ファイルを削除しました' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, error: 'ファイルの削除に失敗しました' });
  }
});

export default router;
