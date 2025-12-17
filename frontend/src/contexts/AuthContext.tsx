import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth';
import type { User as DBUser } from '../db/models';

type User = Omit<DBUser, 'password'>;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin';

  // 初期化時にセッションがあればユーザー情報を取得
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    
    if (!result.success) {
      throw new Error(result.error || 'ログインに失敗しました');
    }
    
    setUser(result.user!);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
