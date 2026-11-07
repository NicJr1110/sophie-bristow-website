// POST /api/checkout { artworkId } → { url } of a Stripe-hosted Checkout page.
// Reserves the piece for 31 minutes first, so nobody else can buy it meanwhile (spec §7).
import { json, siteOrigin, type Env } from '../../server/env';
import { sanityQuery, sanityMutate, patchArtwork } from '../../server/sanity';
import { stripeRequest } from '../../server/stripe';
import { ARTWORK_FIELDS, RESERVATION_MINUTES, isAvailable, isValidArtworkId, toPence, type ArtworkRecord } from '../../server/artwork';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => ({}))) as { artworkId?: unknown };
  if (!isValidArtworkId(body.artworkId)) return json({ error: 'bad_request' }, 400);
  const id = body.artworkId;

  const art = await sanityQuery<ArtworkRecord | null>(env, `*[_type == "artwork" && _id == $id][0]{${ARTWORK_FIELDS}}`, {
    id,
  });
  if (!art) return json({ error: 'not_found' }, 404);
  if (!isAvailable(art)) return json({ error: 'sold' }, 409);
  if (!(typeof art.price === 'number' && art.price > 0)) return json({ error: 'not_for_sale' }, 400);

  // 1. Reserve. ifRevisionID makes this atomic: if two people click Buy at once, one gets a 409.
  const expiresAt = Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60;
  const token = crypto.randomUUID();
  const reserve = await patchArtwork(
    env,
    id,
    { status: 'reserved', reservedUntil: new Date(expiresAt * 1000).toISOString(), reservationToken: token },
    [],
    art._rev,
  );
  if (reserve.status === 409) return json({ error: 'sold' }, 409);
  if (!reserve.ok) return json({ error: 'reserve_failed' }, 502);

  // 2. Create the Checkout Session; it expires when the reservation does.
  const site = siteOrigin(env, request);
  const countries = (env.SHIP_COUNTRIES || 'GB').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  const imageUrl = imageForStripe(env, art);

  try {
    const session = await stripeRequest<{ id: string; url: string }>(env.STRIPE_SECRET_KEY, 'POST', 'checkout/sessions', {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: toPence(art.price),
            product_data: { name: art.title, ...(imageUrl ? { images: [imageUrl] } : {}) },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: countries },
      phone_number_collection: { enabled: true },
      expires_at: expiresAt,
      metadata: { artworkId: id },
      payment_intent_data: { metadata: { artworkId: id } },
      success_url: `${site}/thank-you/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout-cancelled/?a=${encodeURIComponent(id)}&t=${token}`,
    });

    await patchArtwork(env, id, { reservedSession: session.id });
    return json({ url: session.url });
  } catch (err) {
    console.error('checkout failed', err);
    // Undo the reservation so the piece isn't stuck as Sold.
    await sanityMutate(env, [
      { patch: { id, set: { status: 'available' }, unset: ['reservedUntil', 'reservationToken', 'reservedSession'] } },
    ]);
    return json({ error: 'checkout_failed' }, 502);
  }
};

function imageForStripe(env: Env, art: ArtworkRecord): string | null {
  const ref = art.image?.asset?._ref;
  if (!ref) return null;
  const [, assetId, dims, ext] = ref.split('-');
  const dataset = env.PUBLIC_SANITY_DATASET || 'production';
  return `https://cdn.sanity.io/images/${env.PUBLIC_SANITY_PROJECT_ID}/${dataset}/${assetId}-${dims}.${ext}?w=800&fm=jpg`;
}
