// POST /api/contact { name, email, message, website } (spec §8)
// Emails Sophie (reply-to = sender) and sends the sender the auto-reply set in Sanity.
import { json, type Env } from '../../server/env';
import { sanityQuery } from '../../server/sanity';
import { escapeHtml, formatUkDate, layout, oneLine, sendEmail, textToHtml } from '../../server/email';

const MAX_MESSAGE = 2000;
const RATE_LIMIT_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AutoReply = {
  autoReplySubject?: string;
  autoReplyBody?: string;
  awayMode?: boolean;
  awayReplySubject?: string;
  awayReplyBody?: string;
};

const DEFAULT_REPLY = {
  subject: 'Thanks for getting in touch',
  body: "Hi,\n\nThanks for your message. I'll get back to you as soon as I can.\n\nSophie",
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const data = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return json({ error: 'bad_request' }, 400);

  // Honeypot filled → pretend it worked, send nothing.
  if (typeof data.website === 'string' && data.website.trim() !== '') return json({ ok: true });

  const name = oneLine(String(data.name ?? '')).slice(0, 200);
  const email = oneLine(String(data.email ?? '')).slice(0, 254);
  const message = String(data.message ?? '').trim();
  if (!name || !EMAIL_RE.test(email) || !message || message.length > MAX_MESSAGE) {
    return json({ error: 'invalid' }, 400);
  }

  if (await isRateLimited(env, request)) return json({ error: 'rate_limited' }, 429);

  // 1. Notification to Sophie. Template is fixed in code (Nic edits it if needed).
  const date = formatUkDate();
  try {
    await sendEmail(env, {
      to: env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nDate: ${date}\n\nMessage:\n${message}\n\nJust hit reply to answer ${name}.`,
      html: layout(
        `<h2 style="margin-top:0">New message from ${escapeHtml(name)}</h2>
         <p><strong>Name:</strong> ${escapeHtml(name)}<br>
            <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br>
            <strong>Date:</strong> ${escapeHtml(date)}</p>
         <div style="border-left:3px solid #d9d6d0;padding-left:14px">${textToHtml(message)}</div>
         <p style="color:#6b6b6b;font-size:13px">Just hit reply to answer ${escapeHtml(name)}.</p>`,
      ),
    });
  } catch (err) {
    console.error('notification failed', err);
    return json({ error: 'send_failed' }, 502);
  }

  // 2. Auto-reply to the sender, editable in Sanity (normal or away message). Best effort.
  try {
    const reply = await getAutoReply(env);
    await sendEmail(env, {
      to: email,
      replyTo: env.CONTACT_TO_EMAIL,
      subject: reply.subject,
      text: reply.body,
      html: layout(textToHtml(reply.body)),
    });
  } catch (err) {
    console.error('auto-reply failed', err);
  }

  return json({ ok: true });
};

async function getAutoReply(env: Env) {
  if (!env.PUBLIC_SANITY_PROJECT_ID) return DEFAULT_REPLY;
  const s = await sanityQuery<AutoReply | null>(
    env,
    `*[_id == "siteSettings"][0]{ autoReplySubject, autoReplyBody, awayMode, awayReplySubject, awayReplyBody }`,
  ).catch(() => null);
  if (s?.awayMode && s.awayReplyBody) {
    return { subject: s.awayReplySubject || DEFAULT_REPLY.subject, body: s.awayReplyBody };
  }
  return { subject: s?.autoReplySubject || DEFAULT_REPLY.subject, body: s?.autoReplyBody || DEFAULT_REPLY.body };
}

/** ~5 submissions per IP per hour, using the optional RATE_LIMIT KV namespace. */
async function isRateLimited(env: Env, request: Request): Promise<boolean> {
  if (!env.RATE_LIMIT) return false;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const key = `contact:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  const count = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (count >= RATE_LIMIT_PER_HOUR) return true;
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3600 });
  return false;
}
