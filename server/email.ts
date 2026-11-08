import type { Env } from './env';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip line breaks so user input can't break email headers like Subject. */
export function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}

export function formatUkDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(d);
}

/** Plain text → simple HTML paragraphs. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export type Email = { to: string; subject: string; text: string; html: string; replyTo?: string };

/** Send via Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendEmail(env: Env, email: Email): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email.to],
      subject: oneLine(email.subject),
      text: email.text,
      html: email.html,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/**
 * Wrap content in a minimal, email-client-safe layout, with Sophie's S/B mark in the
 * bottom-right corner. Pass the site origin so the logo can load (PNG: Gmail won't show SVG).
 */
export function layout(inner: string, origin?: string): string {
  const logo = origin
    ? `<div style="text-align:right;margin-top:28px"><img src="${escapeHtml(origin)}/sb-email.png" width="52" height="64" alt="Sophie Bristow" style="display:inline-block;border:0;width:52px;height:64px"></div>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f4f1;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:28px;border:1px solid #e3e1dc">${inner}${logo}</div>
</body></html>`;
}
