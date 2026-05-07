import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_URL is set by GitHub Actions to /repo-name/
  // Falls back to / for local dev
  base: process.env.VITE_BASE_URL || '/',
})
