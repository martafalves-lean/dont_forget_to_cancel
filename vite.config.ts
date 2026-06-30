import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa para funcionar tanto em servidor proprio como em GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
})
