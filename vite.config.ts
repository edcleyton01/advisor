import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5199, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  build: {
    rollupOptions: {
      output: {
        // vendors estáveis em chunks próprios: mudanças no app não invalidam
        // o cache do React/Supabase no navegador dos usuários
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
