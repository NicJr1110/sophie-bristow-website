/// <reference types="@cloudflare/workers-types" />

/** Cloudflare Pages environment (set in Pages > Settings > Variables and Secrets). */
export interface Env {
  PUBLIC_SANITY_PROJECT_ID: string;
  PUBLIC_SANITY_DATASET?: string;
  SANITY_WRITE_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  CONTACT_TO_EMAIL: string;
  SITE_URL: string;
  SHIP_COUNTRIES?: string;
  /** Optional KV namespace for contact-form rate limiting. */
  RATE_LIMIT?: KVNamespace;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

/** Normalise SITE_URL the same way as astro.config.mjs. Falls back to the request's own origin. */
export function siteOrigin(env: Env, request: Request): string {
  let raw = (env.SITE_URL || '').trim().replace(/^["']|["']$/g, '');
  const scheme = raw.match(/^(https?)[:/]+/i);
  if (raw) raw = scheme ? `${scheme[1].toLowerCase()}://${raw.slice(scheme[0].length)}` : `https://${raw}`;
  try {
    return new URL(raw).origin;
  } catch {
    return new URL(request.url).origin;
  }
}
