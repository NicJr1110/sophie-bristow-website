import { defineConfig } from 'astro/config';

// Fully static build. Server logic lives in /functions (Cloudflare Pages Functions).
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  output: 'static',
  trailingSlash: 'always',
});
