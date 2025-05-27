import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  plugins: [
    vue(),
    commonjs({
      include: [/lamejs/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    })
  ],
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: []
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {}
      }
    }
  },
  resolve: {
    alias: {}
  }
});