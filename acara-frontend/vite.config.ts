import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import viteImagemin from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command }) => {
  const enableImageMin = process.env.ENABLE_IMAGE_MIN === '1';
  const enableBundleReport = process.env.ENABLE_BUNDLE_REPORT === '1';

  return {
    plugins: [
      command === 'serve' && react(),
      tailwindcss(),
      enableImageMin && viteImagemin({
        gifsicle: { optimizationLevel: 7 },
        mozjpeg: { quality: 70 },
        pngquant: { quality: [0.6, 0.8] },
        webp: { quality: 70 },
      }),
      enableBundleReport && visualizer({ open: true, gzipSize: true, filename: 'bundle-report.html' }),
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-ui': ['axios'],
          },
        },
      },
    },
    server: {
      host: true,
      allowedHosts: true as const,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
})
