import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { SKY_COLOR_HEX } from './src/config/beach-scene';

export default defineConfig({
  resolve: {
    // Layer aliases live only in tsconfig.json.
    tsconfigPaths: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Volley Mind',
        short_name: 'Volley Mind',
        description: 'Jogo 3D de vôlei para o navegador, pensado para o celular.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: SKY_COLOR_HEX,
        background_color: SKY_COLOR_HEX,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
