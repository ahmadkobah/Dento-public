import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Main App Vite Config (Admin)
// Runs on port 5173
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      'react': resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      // react-odontogram doesn't export CSS in its package.json exports field
      'react-odontogram/dist/index.css': resolve(__dirname, 'node_modules/react-odontogram/dist/index.css'),
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@refinedev/core',
      '@refinedev/react-router',
      '@refinedev/supabase',
      '@supabase/supabase-js',
      'date-fns',
      'dompurify',
      'lucide-react',
      'clsx',
      'framer-motion',
    ],
    // Force re-optimization when deps change
    force: true,
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React + Router
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // Refine framework
          'vendor-refine': [
            '@refinedev/core',
            '@refinedev/react-router',
            '@refinedev/supabase',
          ],
          // Supabase client
          'vendor-supabase': [
            '@supabase/supabase-js',
          ],
          // Animation
          'vendor-framer': [
            'framer-motion',
          ],
          // Icons
          'vendor-icons': [
            'lucide-react',
          ],
          // Date & DOM utilities
          'vendor-utils': [
            'date-fns',
            'clsx',
            'dompurify',
          ],
          // Rich text editor
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
          ],
          // Drag & drop
          'vendor-dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
          // LiveKit (video/real-time)
          'vendor-livekit': [
            'livekit-client',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false, // Falls back to next available port if 5173 is busy
  },
})
