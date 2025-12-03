import axios from 'axios';

// 開発環境: Viteプロキシ経由で /api にアクセス（同一オリジン）
// 本番環境: 環境変数で指定されたAPIサーバーにアクセス
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター - トークンを自動付与
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター
export const setupInterceptors = (onUnauthenticated: () => void) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onUnauthenticated();
      }
      return Promise.reject(error);
    }
  );
};
