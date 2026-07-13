import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project site from /<repo>/, so the CI sets BASE_PATH.
// Locally (dev/preview) it defaults to '/'.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Card Game Builder',
        short_name: 'CardGames',
        description:
          'Design your own Spot-It / Dobble-style matching card games and export print-ready PDFs.',
        theme_color: '#5b8def',
        background_color: '#0f1424',
        display: 'standalone',
        orientation: 'any',
        id: base,
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // pdf-lib is chunky; make sure the precache limit is generous enough.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
