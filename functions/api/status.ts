// GET /api/status → { [artworkId]: 'available' | 'sold' }. Live, never cached (spec §7).
import { json, type Env } from '../../server/env';
import { sanityQuery } from '../../server/sanity';
import { publicStatus, type ArtworkRecord } from '../../server/artwork';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.PUBLIC_SANITY_PROJECT_ID) return json({});
  try {
    const docs = await sanityQuery<Pick<ArtworkRecord, '_id' | 'status' | 'reservedUntil'>[]>(
      env,
      `*[_type == "artwork"]{ _id, status, reservedUntil }`,
    );
    const now = Date.now();
    return json(Object.fromEntries(docs.map((d) => [d._id, publicStatus(d, now)])));
  } catch (err) {
    console.error('status failed', err);
    return json({ error: 'unavailable' }, 503);
  }
};
