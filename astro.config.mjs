import { defineConfig } from 'astro/config';

/**
 * Accept SITE_URL with or without https://, with stray spaces, quotes, a trailing slash
 * or a mangled scheme ("https//", "https:/"), so a mistyped value in Cloudflare can never
 * fail the build. Anything still unparseable falls back to the real domain.
 */
function siteUrl() {
  let raw = (process.env.SITE_URL || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) return 'https://sophiebristow.com';
  const scheme = raw.match(/^(https?)[:/]+/i);
  raw = scheme ? `${scheme[1].toLowerCase()}://${raw.slice(scheme[0].length)}` : `https://${raw}`;
  try {
    return new URL(raw).origin;
  } catch {
    console.warn(`[config] Ignoring invalid SITE_URL "${process.env.SITE_URL}", using https://sophiebristow.com`);
    return 'https://sophiebristow.com';
  }
}

// Fully static build. Server logic lives in /functions (Cloudflare Pages Functions).
export default defineConfig({
  site: siteUrl(),
  output: 'static',
  trailingSlash: 'always',
});
