import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // Forward API calls to the FastAPI backend.
      '/api': 'http://localhost:8000',
    },
  },
})

