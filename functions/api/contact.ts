// POST /api/contact { enquiryType, name, email, message, website } (spec §8)
// Emails Sophie (reply-to = sender), then sends the sender the auto-reply template
// mapped to their enquiry type in Sanity (or the away message if away mode is on).
import { json, siteOrigin, type Env } from '../../server/env';
import { sanityQuery } from '../../server/sanity';
import { escapeHtml, formatUkDate, layout, oneLine, sendEmail, textToHtml } from '../../server/email';
import { pickAutoReply, pickRecipient, type AwaySettings, type EnquiryLookup } from '../../server/autoReply';

const MAX_MESSAGE = 2000;
const RATE_LIMIT_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[A-Za-z0-9_.-]{1,128}$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const data = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return json({ error: 'bad_request' }, 400);

  // Honeypot filled → pretend it worked, send nothing.
  if (typeof data.website === 'string' && data.website.trim() !== '') return json({ ok: true });

  const name = oneLine(String(data.name ?? '')).slice(0, 200);
  const email = oneLine(String(data.email ?? '')).slice(0, 254);
  const message = String(data.message ?? '').trim();
  const enquiryTypeId = String(data.enquiryType ?? '');
  if (!name || !EMAIL_RE.test(email) || !message || message.length > MAX_MESSAGE) {
    return json({ error: 'invalid' }, 400);
  }
  // All fields are required, including the enquiry type.
  if (!ID_RE.test(enquiryTypeId) || enquiryTypeId.startsWith('drafts.')) {
    return json({ error: 'invalid' }, 400);
  }

  if (await isRateLimited(env, request)) return json({ error: 'rate_limited' }, 429);

  const { settings, enquiry } = await lookup(env, enquiryTypeId);
  // If Sophie deleted a type just before the site rebuilt, still deliver the message.
  const enquiryLabel = enquiry?.label ?? 'General';
  // Each enquiry type can go to its own inbox (e.g. Tattoo → tattoo Gmail); otherwise the main one.
  const inbox = pickRecipient(enquiry, env.CONTACT_TO_EMAIL);
  const origin = siteOrigin(env, request);

  // 1. Notification to Sophie. Template is fixed in code (Nic edits it if needed).
  const date = formatUkDate();
  const notification = {
    replyTo: email,
    subject: `New message from ${name} (${enquiryLabel})`,
    text: `Enquiry type: ${enquiryLabel}\nName: ${name}\nEmail: ${email}\nDate: ${date}\n\nMessage:\n${message}\n\nJust hit reply to answer ${name}.`,
    html: layout(
      `<h2 style="margin-top:0">New message from ${escapeHtml(name)}</h2>
       <p><strong>Enquiry type:</strong> ${escapeHtml(enquiryLabel)}<br>
          <strong>Name:</strong> ${escapeHtml(name)}<br>
          <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br>
          <strong>Date:</strong> ${escapeHtml(date)}</p>
       <div style="border-left:3px solid #d9d6d0;padding-left:14px">${textToHtml(message)}</div>
       <p style="color:#6b6b6b;font-size:13px">Just hit reply to answer ${escapeHtml(name)}.</p>`,
      origin,
    ),
  };
  try {
    await sendEmail(env, { ...notification, to: inbox });
  } catch (err) {
    console.error(`notification to ${inbox} failed`, err);
    // A mistyped "Send enquiries to" address mustn't lose the message: try the main inbox.
    if (inbox === env.CONTACT_TO_EMAIL) return json({ error: 'send_failed' }, 502);
    try {
      await sendEmail(env, { ...notification, to: env.CONTACT_TO_EMAIL });
    } catch (err2) {
      console.error('fallback notification failed', err2);
      return json({ error: 'send_failed' }, 502);
    }
  }

  // 2. Auto-reply to the sender. Best effort: Sophie already has the message.
  try {
    const reply = pickAutoReply(settings, enquiry);
    await sendEmail(env, {
      to: email,
      replyTo: inbox, // the customer's reply lands in the same inbox as their enquiry
      subject: reply.subject,
      text: reply.body,
      html: layout(textToHtml(reply.body), origin),
    });
  } catch (err) {
    console.error('auto-reply failed', err);
  }

  return json({ ok: true });
};

async function lookup(env: Env, enquiryTypeId: string): Promise<{ settings: AwaySettings; enquiry: EnquiryLookup }> {
  if (!env.PUBLIC_SANITY_PROJECT_ID) return { settings: null, enquiry: null };
  const result = await sanityQuery<{ settings: AwaySettings; enquiry: EnquiryLookup }>(
    env,
    `{
      "settings": *[_id == "siteSettings"][0]{ awayMode, awayReplySubject, awayReplyBody },
      "enquiry": *[_type == "enquiryType" && _id == $id][0]{ label, sendTo, template->{ subject, body } }
    }`,
    { id: enquiryTypeId },
  ).catch((err) => {
    console.error('sanity lookup failed', err);
    return { settings: null, enquiry: null };
  });
  return result;
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
