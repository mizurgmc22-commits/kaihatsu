import { db } from '../db';
import type { User, UserRole } from '../db/models';

// セッション情報
interface Session {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

const SESSION_KEY = 'auth_session';

// パスワードハッシュ化（Web Crypto API使用）
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// パスワード検証
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// ログイン
export async function login(email: string, password: string): Promise<{ success: boolean; user?: Omit<User, 'password'>; error?: string }> {
  const normalizedEmail = email.toLowerCase();
  const user = await db.users.where('email').equals(normalizedEmail).first();
  
  if (!user) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }
  
  if (!user.isActive) {
    return { success: false, error: 'このアカウントは無効化されています' };
  }
  
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }
  
  // 最終ログイン日時を更新
  await db.users.update(user.id!, { lastLoginAt: new Date(), updatedAt: new Date() });
  
  // セッション保存
  const session: Session = {
    userId: user.id!,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  // パスワードを除外して返す
  const { password: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword };
}

// ログアウト
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// 現在のセッション取得
export function getSession(): Session | null {
  const sessionData = sessionStorage.getItem(SESSION_KEY);
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData) as Session;
  } catch {
    return null;
  }
}

// 現在のユーザー取得
export async function getCurrentUser(): Promise<Omit<User, 'password'> | null> {
  const session = getSession();
  if (!session) return null;
  
  const user = await db.users.get(session.userId);
  if (!user) {
    logout();
    return null;
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// ユーザー登録
export async function register(userData: {
  name: string;
  email: string;
  password: string;
  department: string;
  phoneNumber?: string;
  extensionNumber?: string;
}): Promise<{ success: boolean; user?: Omit<User, 'password'>; error?: string }> {
  const normalizedEmail = userData.email.toLowerCase();
  
  // メールアドレスの重複チェック
  const existing = await db.users.where('email').equals(normalizedEmail).first();
  if (existing) {
    return { success: false, error: 'このメールアドレスは既に登録されています' };
  }
  
  const hashedPassword = await hashPassword(userData.password);
  const now = new Date();
  
  const id = await db.users.add({
    name: userData.name,
    email: normalizedEmail,
    password: hashedPassword,
    role: 'user',
    department: userData.department,
    phoneNumber: userData.phoneNumber,
    extensionNumber: userData.extensionNumber,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });
  
  const user = await db.users.get(id);
  if (!user) {
    return { success: false, error: 'ユーザーの作成に失敗しました' };
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword };
}

// ユーザー一覧取得（管理者用）
export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  const users = await db.users.filter(u => !u.deletedAt).toArray();
  return users.map(({ password: _, ...user }) => user);
}

// ユーザー更新
export async function updateUser(
  id: number,
  data: Partial<Omit<User, 'id' | 'password' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const user = await db.users.get(id);
  if (!user) {
    return { success: false, error: 'ユーザーが見つかりません' };
  }
  
  await db.users.update(id, { ...data, updatedAt: new Date() });
  return { success: true };
}

// パスワード変更
export async function changePassword(
  id: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await db.users.get(id);
  if (!user) {
    return { success: false, error: 'ユーザーが見つかりません' };
  }
  
  const isValid = await verifyPassword(currentPassword, user.password);
  if (!isValid) {
    return { success: false, error: '現在のパスワードが正しくありません' };
  }
  
  const hashedPassword = await hashPassword(newPassword);
  await db.users.update(id, { password: hashedPassword, updatedAt: new Date() });
  return { success: true };
}

// ユーザー削除（論理削除）
export async function deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
  const user = await db.users.get(id);
  if (!user) {
    return { success: false, error: 'ユーザーが見つかりません' };
  }
  
  await db.users.update(id, { deletedAt: new Date(), isActive: false, updatedAt: new Date() });
  return { success: true };
}

// 権限チェック
export function isAdmin(session: Session | null): boolean {
  return session?.role === 'admin' || session?.role === 'system_admin';
}
