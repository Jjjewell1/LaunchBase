import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetName;
          if (assetInfo.name.endsWith('.css')) extType = 'css';
          if (assetInfo.name.endsWith('.js')) extType = 'js';
          if (assetInfo.name.endsWith('.png')) extType = 'images/[name][extname]';
          if (assetInfo.name.endsWith('.svg')) extType = 'icons/[name][extname]';
          return extType;
        },
      },
    },
  },
});