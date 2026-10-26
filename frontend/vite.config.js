
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 開発時は Rails（localhost:3000）へ転送する
const rails = 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['reply-porthole-unlit.ngrok-free.dev'],
    proxy: {
      '/api': rails,
      '/characters': rails,
      '/rails/active_storage': rails,
    },
  },
})
