import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@clerk')) return 'clerk'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react-quill') || id.includes('quill')) return 'editor'
          if (id.includes('socket.io-client')) return 'realtime'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'

          return 'vendor'
        },
      },
    },
  },
})
