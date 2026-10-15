import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/alerts": "http://localhost:4000",
      "/monitor": "http://localhost:4000",
      "/settings": "http://localhost:4000",
      "/health": "http://localhost:4000",
    },
  },
  preview: {
    port: 3000,
  },
})
