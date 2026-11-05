// POST /api/stripe-webhook. Stripe calls this after checkout.
// Subscribe the endpoint to: checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.expired
import { json, type Env } from '../../server/env';
import { sanityQuery, patchArtwork } from '../../server/sanity';
import { verifyStripeSignature } from '../../server/stripe';
import { ARTWORK_FIELDS, isValidArtworkId, type ArtworkRecord } from '../../server/artwork';
import { escapeHtml, formatUkDate, layout, sendEmail } from '../../server/email';

type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
type Session = {
  id: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number | null;
  currency: string;
  metadata?: { artworkId?: string };
  customer_details?: { name?: string; email?: string; phone?: string; address?: Address };
  shipping_details?: { name?: string; address?: Address };
  collected_information?: { shipping_details?: { name?: string; address?: Address } };
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: 'bad_signature' }, 400);

  const event = JSON.parse(payload) as { type: string; data: { object: Session } };
  const session = event.data.object;
  const artworkId = session.metadata?.artworkId;
  if (!isValidArtworkId(artworkId)) return json({ received: true }); // not one of ours

  const art = await sanityQuery<ArtworkRecord | null>(env, `*[_type == "artwork" && _id == $id][0]{${ARTWORK_FIELDS}}`, {
    id: artworkId,
  });
  if (!art) return json({ received: true });

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (session.payment_status !== 'paid') break; // async methods finish later
      if (art.status === 'sold' && art.soldSession === session.id) break; // webhook retry: already done

      const res = await patchArtwork(
        env,
        artworkId,
        { status: 'sold', soldAt: new Date().toISOString(), soldSession: session.id },
        ['reservedUntil', 'reservationToken', 'reservedSession'],
      );
      if (!res.ok) return json({ error: 'sanity_update_failed' }, 500); // Stripe will retry

      try {
        await sendEmail(env, saleEmail(env, art, session));
      } catch (err) {
        // The sale is recorded and in the Stripe dashboard; don't make Stripe retry for an email.
        console.error('sale email failed', err);
      }
      break;
    }

    case 'checkout.session.expired': {
      // Only release if this session still holds the reservation.
      if (art.status === 'reserved' && art.reservedSession === session.id) {
        await patchArtwork(env, artworkId, { status: 'available' }, ['reservedUntil', 'reservationToken', 'reservedSession']);
      }
      break;
    }
  }

  return json({ received: true });
};

function formatAddress(a?: Address): string[] {
  if (!a) return [];
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean) as string[];
}

function saleEmail(env: Env, art: ArtworkRecord, s: Session) {
  const shipping = s.collected_information?.shipping_details ?? s.shipping_details;
  const buyer = s.customer_details ?? {};
  const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: (s.currency || 'gbp').toUpperCase() }).format(
    (s.amount_total ?? 0) / 100,
  );
  const address = formatAddress(shipping?.address ?? buyer.address);

  const rows: [string, string][] = [
    ['Piece', art.title],
    ['Amount', amount],
    ['Buyer', buyer.name ?? ''],
    ['Email', buyer.email ?? ''],
    ['Phone', buyer.phone ?? ''],
    ['Ship to', [shipping?.name, ...address].filter(Boolean).join('\n')],
    ['Date', formatUkDate()],
  ];

  const text =
    `Good news, "${art.title}" has sold!\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nThe full order is in your Stripe dashboard.`;

  const html = layout(
    `<h2 style="margin-top:0">Sold: ${escapeHtml(art.title)}</h2>
     <table style="border-collapse:collapse;width:100%">${rows
       .map(
         ([k, v]) =>
           `<tr><td style="padding:6px 12px 6px 0;color:#6b6b6b;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`,
       )
       .join('')}</table>
     <p style="color:#6b6b6b;font-size:13px">The full order is in your Stripe dashboard.</p>`,
  );

  return { to: env.CONTACT_TO_EMAIL, subject: `Sold: ${art.title}`, text, html, replyTo: buyer.email };
}
