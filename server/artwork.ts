export type ArtworkRecord = {
  _id: string;
  _rev: string;
  title: string;
  price?: number;
  status?: 'available' | 'reserved' | 'sold';
  reservedUntil?: string;
  reservedSession?: string;
  reservationToken?: string;
  soldSession?: string;
  image?: { asset?: { _ref: string } };
};

export const ARTWORK_FIELDS = `_id, _rev, title, price, status, reservedUntil, reservedSession, reservationToken, soldSession, image`;

/** Reservation length. Stripe's minimum Checkout expiry is 30 minutes; 31 gives headroom. */
export const RESERVATION_MINUTES = 31;

/** A piece can be bought if it isn't sold and isn't under a live reservation. */
export function isAvailable(a: Pick<ArtworkRecord, 'status' | 'reservedUntil'>, now = Date.now()): boolean {
  if (a.status === 'sold') return false;
  if (a.status === 'reserved' && a.reservedUntil && Date.parse(a.reservedUntil) > now) return false;
  return true;
}

/** What visitors see: reserved shows as Sold. */
export function publicStatus(a: Pick<ArtworkRecord, 'status' | 'reservedUntil'>, now = Date.now()) {
  return isAvailable(a, now) ? 'available' : 'sold';
}

/** Sanity document IDs are safe characters only; never accept drafts. */
export function isValidArtworkId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(id) && !id.startsWith('drafts.');
}

/** Price is entered in pounds in the CMS; Stripe wants integer pence. */
export function toPence(price: number): number {
  return Math.round(price * 100);
}
