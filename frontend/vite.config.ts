import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // APIリクエストをバックエンドにプロキシ転送
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        // 接続エラー時のリトライ設定
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Proxy Error]', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[Proxy]', req.method, req.url);
          });
        }
      }
    }
  },
  // 環境変数のプレフィックス設定
  envPrefix: 'VITE_'
});
