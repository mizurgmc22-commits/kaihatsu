import type { Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import type { AuthenticatedRequest, UserRole } from '../types/index.js';
import { query } from '../db/index.js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

/**
 * Middleware to verify Firebase ID token
 * Sets req.user with uid, email, and role
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '認証トークンが必要です' });
    return;
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get role from custom claims
    const role = (decodedToken.role as UserRole) || 'user';
    
    // Try to find user in database
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role,
      userId: userResult.rows[0]?.id,
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ success: false, error: '無効な認証トークンです' });
  }
}

/**
 * Middleware to require admin role
 * Must be used after verifyToken
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: '認証が必要です' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '管理者権限が必要です' });
    return;
  }
  
  next();
}

/**
 * Optional authentication - sets user if token present, continues otherwise
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const role = (decodedToken.role as UserRole) || 'user';
    
    const userResult = await query<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role,
      userId: userResult.rows[0]?.id,
    };
  } catch {
    // Token invalid, continue without user
  }
  
  next();
}

export { admin };
