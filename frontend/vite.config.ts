import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the FastAPI backend.
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor'
          }
          if (id.includes('recharts')) {
            return 'charts'
          }
          if (id.includes('lucide-react')) {
            return 'icons'
          }
          if (id.includes('papaparse')) {
            return 'utils'
          }
        }
      }
    }
  }
})

