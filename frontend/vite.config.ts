import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  // 環境変数のプレフィックス設定
  envPrefix: 'VITE_'
});
