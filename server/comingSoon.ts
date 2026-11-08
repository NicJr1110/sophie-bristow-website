// Coming-soon mode: pure logic, kept separate from the middleware so it can be tested.

export type ComingSoonSettings = {
  comingSoon?: boolean;
  comingSoonMessage?: string;
  instagramHandle?: string;
  previewKey?: string;
  showShop?: boolean;
} | null;

export const PREVIEW_COOKIE = 'sb_preview';
const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export type Decision =
  | { kind: 'site' } // serve the real site
  | { kind: 'enter-preview'; key: string } // set cookie, redirect to clean URL
  | { kind: 'exit-preview' } // clear cookie, redirect to clean URL
  | { kind: 'coming-soon' };

/**
 * Who sees what:
 * - /api/* always works (Stripe webhook, contact form).
 * - Switch off, or settings missing → real site (fail open, so a Sanity outage never hides a live site).
 * - Switch on → coming-soon page, unless the visitor has the preview key
 *   (via ?preview=KEY once, which sets a cookie). ?preview=off exits.
 */
export function decide(url: URL, cookieHeader: string | null, s: ComingSoonSettings): Decision {
  if (url.pathname.startsWith('/api/')) return { kind: 'site' };

  const param = url.searchParams.get('preview');
  if (param === 'off') return { kind: 'exit-preview' };

  // The preview link works whether or not Coming soon is on (it also unlocks a hidden shop).
  const key = validKey(s);
  if (key && param === key) return { kind: 'enter-preview', key };

  if (!s?.comingSoon) return { kind: 'site' };
  if (hasPreview(cookieHeader, s)) return { kind: 'site' };
  return { kind: 'coming-soon' };
}

function validKey(s: ComingSoonSettings): string | null {
  return s?.previewKey && KEY_RE.test(s.previewKey) ? s.previewKey : null;
}

export function hasPreview(cookieHeader: string | null, s: ComingSoonSettings): boolean {
  const key = validKey(s);
  return Boolean(key && readCookie(cookieHeader, PREVIEW_COOKIE) === key);
}

const SHOP_PATHS = [/^\/shop(\/|$)/, /^\/artwork(\/|$)/, /^\/api\/checkout(\/|$)/, /^\/thank-you(\/|$)/, /^\/checkout-cancelled(\/|$)/];

/**
 * Shop switch ("Show shop" in Site settings). When off, the shop pages and checkout are closed
 * to the public; anyone with the preview cookie can still use them (for testing Stripe).
 * Settings missing (no Sanity / outage) → allow, matching Coming soon's fail-open behaviour.
 */
export function shopAccess(url: URL, cookieHeader: string | null, s: ComingSoonSettings): 'allow' | 'closed' {
  if (!SHOP_PATHS.some((re) => re.test(url.pathname))) return 'allow';
  if (!s || s.showShop) return 'allow';
  if (hasPreview(cookieHeader, s)) return 'allow';
  return 'closed';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function comingSoonHtml(s: ComingSoonSettings): string {
  const message = s?.comingSoonMessage?.trim() || 'Coming soon';
  const handle = (s?.instagramHandle ?? '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
  const insta = handle
    ? `<a href="https://www.instagram.com/${handle}/" rel="noopener">@${esc(handle)}</a>`
    : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#eeede9">
<meta name="robots" content="noindex">
<title>Sophie Bristow · ${esc(message)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abel&display=swap">
<style>
  :root { --bg:#eeede9; --text:#1a1a1a; --muted:#6b6b6b; }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; overscroll-behavior-y:none; }
  html { background:var(--bg) url('/paper.jpg') repeat; background-size:512px 512px; }
  body { background:var(--bg) url('/paper.jpg') repeat; background-size:512px 512px; color:var(--text); font-family:'Abel',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
         display:flex; align-items:center; justify-content:center; text-align:center; padding:24px; }
  h1 { font-family:'Abel',system-ui,sans-serif; font-weight:400; letter-spacing:-.01em; font-size:clamp(2.4rem,8vw,4rem); margin:0 0 12px; }
  p { margin:0 0 20px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-size:.85rem; }
  a { color:var(--text); text-underline-offset:5px; }
  .splash { position:fixed; right:2vw; bottom:2vh; width:85vw; height:32vh; z-index:-1; pointer-events:none;
            background:url('/splash-flower.png') no-repeat right bottom / contain; }
  @media (min-width:768px){ .splash { width:50vw; height:33.333vh; } }
  @media (min-width:1024px){ .splash { width:33.333vw; } }
  .splash { opacity:.9; }
</style>
</head>
<body>
  <div class="splash" aria-hidden="true"></div>
  <main>
    <h1>Sophie Bristow</h1>
    <p>${esc(message)}</p>
    ${insta}
  </main>
</body>
</html>`;
}
