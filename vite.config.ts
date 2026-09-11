import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/amber-shroud/' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 43177,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 43177,
  },
})
