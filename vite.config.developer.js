import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Developer Portal Vite Config
// Runs on port 9000 separately from main app (5173)
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react',
      'clsx',
    ],
    force: true,
  },
  plugins: [
    react(),
    {
      name: 'dev-portal-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve developer.html for all routes except assets
          if (!req.url.startsWith('/src/') && 
              !req.url.startsWith('/node_modules/') && 
              !req.url.startsWith('/@') &&
              !req.url.includes('.')) {
            req.url = '/developer.html';
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 9000,
    host: true,
  },
  build: {
    outDir: 'dist-developer',
    rollupOptions: {
      input: resolve(__dirname, 'developer.html'),
    },
  },
})
