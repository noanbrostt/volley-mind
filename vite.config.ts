import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { GYM_BACKGROUND_COLOR_HEX } from './src/config/court-scene';

// GitHub Pages serves the game from https://noanbrostt.github.io/volley-mind/; dev stays at /.
const PAGES_BASE = '/volley-mind/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
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
        // start_url and scope follow Vite's base, so the installed app opens on its own path.
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: GYM_BACKGROUND_COLOR_HEX,
        background_color: GYM_BACKGROUND_COLOR_HEX,
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
}));
