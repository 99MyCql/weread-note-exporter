import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
          transform: (content) => {
            // 修复dist目录中的manifest路径
            return content.toString()
              .replace(/"default_popup": "dist\/index\.html"/g, '"default_popup": "index.html"')
              .replace(/"js": \["dist\/content\.js"\]/g, '"js": ["content.js"]')
              .replace(/"resources": \["dist\/assets\/\*"\]/g, '"resources": ["assets/*"]');
          }
        },
        {
          src: 'src/content.js',
          dest: '.'
        }
      ]
    })
  ],
  base: './', // 使用相对路径
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'index.html',
      },
      output: {
        // 确保CSS文件被提取出来
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    cssCodeSplit: false, // 将所有CSS提取到一个文件中
  },
  server: {
    port: 3000,
  },
});