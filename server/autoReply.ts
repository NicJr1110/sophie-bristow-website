export type Reply = { subject: string; body: string };

export type AwaySettings = { awayMode?: boolean; awayReplySubject?: string; awayReplyBody?: string } | null;

export type EnquiryLookup = {
  label?: string;
  sendTo?: string;
  template?: { subject?: string; body?: string } | null;
} | null;

export const DEFAULT_REPLY: Reply = {
  subject: 'Thanks for getting in touch',
  body: "Hi,\n\nThanks for your message. I'll get back to you as soon as I can.\n\nSophie",
};

/**
 * Which auto-reply to send:
 * 1. Away mode on (with a message) → away message, whatever they picked.
 * 2. Otherwise → the template mapped to their enquiry type.
 * 3. Missing type or template → a safe default, so the sender still hears back.
 */
export function pickAutoReply(settings: AwaySettings, enquiry: EnquiryLookup): Reply {
  if (settings?.awayMode && settings.awayReplyBody) {
    return { subject: settings.awayReplySubject || DEFAULT_REPLY.subject, body: settings.awayReplyBody };
  }
  const t = enquiry?.template;
  if (t?.body) return { subject: t.subject || DEFAULT_REPLY.subject, body: t.body };
  return DEFAULT_REPLY;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Which inbox gets an enquiry (and replies to its auto-reply): the enquiry type's
 * "Send enquiries to" address from Sanity, else the main inbox (CONTACT_TO_EMAIL).
 */
export function pickRecipient(enquiry: EnquiryLookup, fallback: string): string {
  const to = enquiry?.sendTo?.trim();
  return to && EMAIL_RE.test(to) ? to : fallback;
}
