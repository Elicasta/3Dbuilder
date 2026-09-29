import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420,
  },
  build: {
    // Three + R3F is intentionally one graphics runtime. Splitting transitive
    // drei/three dependencies manually created a circular Rollup chunk and did
    // not reduce download cost. Keep stable framework/vendor boundaries and
    // set the warning threshold just above the known graphics runtime.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tauri-apps')) return 'tauri-runtime';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-runtime';
          return 'graphics-vendor';
        },
      },
    },
  },
});
