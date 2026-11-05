// POST /api/release { artworkId, token }. Called from the "Payment cancelled" page so a
// piece goes back on sale immediately instead of waiting out the 30-minute reservation.
import { json, type Env } from '../../server/env';
import { sanityQuery, patchArtwork } from '../../server/sanity';
import { stripeRequest } from '../../server/stripe';
import { ARTWORK_FIELDS, isValidArtworkId, type ArtworkRecord } from '../../server/artwork';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { artworkId, token } = (await request.json().catch(() => ({}))) as { artworkId?: unknown; token?: unknown };
  if (!isValidArtworkId(artworkId) || typeof token !== 'string') return json({ error: 'bad_request' }, 400);

  const art = await sanityQuery<ArtworkRecord | null>(env, `*[_type == "artwork" && _id == $id][0]{${ARTWORK_FIELDS}}`, {
    id: artworkId,
  });
  // The token proves this browser started the checkout; otherwise do nothing.
  if (!art || art.status !== 'reserved' || art.reservationToken !== token) return json({ released: false });

  if (art.reservedSession) {
    try {
      // Expiring the session stops a late payment going through on a released piece.
      await stripeRequest(env.STRIPE_SECRET_KEY, 'POST', `checkout/sessions/${art.reservedSession}/expire`, {});
    } catch (err) {
      // Already completed or expired: let the webhook be the source of truth.
      console.error('expire failed', err);
      return json({ released: false });
    }
  }

  await patchArtwork(env, artworkId, { status: 'available' }, ['reservedUntil', 'reservationToken', 'reservedSession']);
  return json({ released: true });
};
