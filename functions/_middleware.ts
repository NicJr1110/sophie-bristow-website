// Runs before every page. When "Coming soon" is switched on in Sanity (Site settings),
// visitors see a holding page; Sophie previews the real site with her preview link.
// Takes effect within ~30 seconds, with no redeploy.
import type { Env } from '../server/env';
import { sanityQuery } from '../server/sanity';
import { PREVIEW_COOKIE, comingSoonHtml, decide, shopAccess, type ComingSoonSettings } from '../server/comingSoon';

const CACHE_MS = 30_000;
let cached: { at: number; value: ComingSoonSettings } | null = null;

async function getSettings(env: Env): Promise<ComingSoonSettings> {
  if (!env.PUBLIC_SANITY_PROJECT_ID) return null;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const value = await sanityQuery<ComingSoonSettings>(
      env,
      `*[_id == "siteSettings"][0]{ comingSoon, comingSoonMessage, instagramHandle, previewKey, showShop }`,
    );
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error('coming-soon lookup failed', err);
    return cached?.value ?? null; // fail open
  }
}

function cleanUrl(url: URL): string {
  const u = new URL(url);
  u.searchParams.delete('preview');
  return u.pathname + (u.search || '');
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  // The shop used to live at /artwork/
  if (/^\/artwork(\/|$)/.test(url.pathname)) {
    return new Response(null, { status: 301, headers: { Location: '/shop/' } });
  }
  const cookie = request.headers.get('Cookie');
  const settings = await getSettings(env);
  const decision = decide(url, cookie, settings);

  switch (decision.kind) {
    case 'site':
      // Shop switched off: no shop pages, no checkout (preview cookie holders excepted).
      if (shopAccess(url, cookie, settings) === 'closed') {
        if (url.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'shop_closed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          });
        }
        return new Response(null, { status: 302, headers: { Location: '/', 'Cache-Control': 'no-store' } });
      }
      return next();

    case 'enter-preview':
      return new Response(null, {
        status: 302,
        headers: {
          Location: cleanUrl(url),
          'Set-Cookie': `${PREVIEW_COOKIE}=${encodeURIComponent(decision.key)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });

    case 'exit-preview':
      return new Response(null, {
        status: 302,
        headers: {
          Location: cleanUrl(url),
          'Set-Cookie': `${PREVIEW_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });

    case 'coming-soon':
      return new Response(comingSoonHtml(await getSettings(env)), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex',
        },
      });
  }
};
