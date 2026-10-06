import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 開発時は Rails（localhost:3000）へ転送する。同じオリジンになるので CORS の設定はいらない（CLAUDE.md）
//   /api                  … API
//   /characters           … キャラ画像（public/characters）
//   /rails/active_storage … 食事の写真
const rails = 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': rails,
      '/characters': rails,
      '/rails/active_storage': rails,
    },
  },
})
