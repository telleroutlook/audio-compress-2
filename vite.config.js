import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  worker: {
    format: 'es',
    plugins: () => []
  },
  optimizeDeps: {
    include: ['lamejs'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    commonjsOptions: {
      include: [/lamejs/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    }
  },
  plugins: [
    commonjs({
      include: [/lamejs/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    })
  ],
  resolve: {
    alias: {
      'lamejs': 'lamejs'
    }
  }
}) 