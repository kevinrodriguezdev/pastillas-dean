import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    vue(),
    VitePWA({
      // injectManifest: control total del SW para poder manejar push/notificationclick
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Pastillas Perro NFC',
        short_name: 'Pastillas',
        description: 'Control de pastillas del perro con NFC',
        theme_color: '#10b981',
        background_color: '#10b981',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        // Forzamos injectionPoint a cadena vacía para que vite-plugin-pwa
        // NO llame a workbox-build (bug en 0.20.x/1.x donde pasa
        // swSrc === swDest, lo que hace fallar a workbox-build). No
        // necesitamos precache de todos modos.
        injectionPoint: '',
        globDirectory: 'dist'
      },
      devOptions: {
        enabled: false
      }
    })
  ]
});
