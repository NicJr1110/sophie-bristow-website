import { DOC_IDS, SANITY } from './config';
import { picFromSanity, picPlaceholder, sanityImageUrl, type Pic, type SanityImage } from './images';
import { portableTextToHtml } from './portableText';

export type ArtStatus = 'available' | 'sold';

export type GalleryItem = {
  id: string;
  title?: string;
  pic: Pic;
  // Artwork page only
  price?: number;
  status?: ArtStatus;
  description?: string;
};

export type Gallery = { title: string; intro: string; items: GalleryItem[] };

/** True when a Sanity project is configured; otherwise placeholder content is used. */
export const hasSanity = Boolean(SANITY.projectId);

async function query<T>(groq: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(
    `https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}`,
  );
  url.searchParams.set('query', groq);
  url.searchParams.set('perspective', 'published');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

/* ---------- Site settings ---------- */

export type Settings = { backgroundUrl: string };
let settingsPromise: Promise<Settings> | null = null;

export function getSettings(): Promise<Settings> {
  settingsPromise ??= (async () => {
    const fallback = { backgroundUrl: '/splash-flower.png' };
    if (!hasSanity) return fallback;
    const s = await query<{ background?: SanityImage } | null>(`*[_id == $id][0]{ background }`, {
      id: DOC_IDS.settings,
    });
    const url = sanityImageUrl(s?.background, { w: 1600 });
    return url ? { backgroundUrl: url } : fallback;
  })();
  return settingsPromise;
}

/* ---------- Galleries (Flash, Mark Making) ---------- */

type GalleryDoc = {
  title?: string;
  introText?: string;
  images?: (SanityImage & { _key: string; title?: string })[];
};

export async function getGallery(docId: string, fallbackTitle: string): Promise<Gallery> {
  if (!hasSanity) return sampleGallery(docId, fallbackTitle);
  const doc = await query<GalleryDoc | null>(`*[_id == $id][0]{ title, introText, images }`, { id: docId });
  const items: GalleryItem[] = [];
  for (const img of doc?.images ?? []) {
    const pic = picFromSanity(img, img.title ?? '');
    if (pic) items.push({ id: img._key, title: img.title, pic });
  }
  return { title: doc?.title || fallbackTitle, intro: doc?.introText ?? '', items };
}

/* ---------- Artwork (shop) ---------- */

type ArtworkDoc = {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  status?: 'available' | 'reserved' | 'sold';
  reservedUntil?: string;
  image?: SanityImage;
};

/** Reserved pieces show as Sold; an expired reservation counts as available again. */
export function displayStatus(status: ArtworkDoc['status'], reservedUntil?: string, now = Date.now()): ArtStatus {
  if (status === 'sold') return 'sold';
  if (status === 'reserved' && reservedUntil && Date.parse(reservedUntil) > now) return 'sold';
  return 'available';
}

export async function getArtworkGallery(): Promise<Gallery> {
  if (!hasSanity) return sampleArtwork();
  const [page, docs] = await Promise.all([
    query<GalleryDoc | null>(`*[_id == $id][0]{ title, introText }`, { id: DOC_IDS.artwork }),
    query<ArtworkDoc[]>(
      `*[_type == "artwork" && !(_id in path("drafts.**"))] | order(order asc, _createdAt desc){
        _id, title, description, price, status, reservedUntil, image
      }`,
    ),
  ]);
  const items: GalleryItem[] = [];
  for (const d of docs) {
    const pic = picFromSanity(d.image, d.title);
    if (!pic) continue;
    items.push({
      id: d._id,
      title: d.title,
      description: d.description,
      price: d.price,
      status: displayStatus(d.status, d.reservedUntil),
      pic,
    });
  }
  return { title: page?.title || 'Artwork', intro: page?.introText ?? '', items };
}

/* ---------- Bio ---------- */

export type Bio = { photo: Pic | null; html: string };

export async function getBio(): Promise<Bio> {
  if (!hasSanity) {
    return {
      photo: picPlaceholder('sophie-portrait', 'Sophie Bristow'),
      html: '<p>Placeholder bio. Sophie will write this in the CMS.</p><p>Tattoo artist and illustrator based in the UK, working across flash, original artwork and mark making.</p>',
    };
  }
  const doc = await query<{ photo?: SanityImage; body?: unknown[] } | null>(`*[_id == $id][0]{ photo, body }`, {
    id: DOC_IDS.bio,
  });
  return { photo: picFromSanity(doc?.photo, 'Sophie Bristow'), html: portableTextToHtml(doc?.body as never) };
}

/* ---------- Contact form enquiry types ---------- */

export type EnquiryType = { id: string; label: string };

/** Buttons on the contact form, managed by Sophie in Sanity (Contact form → Enquiry types). */
export async function getEnquiryTypes(): Promise<EnquiryType[]> {
  if (!hasSanity) {
    return [
      { id: 'sample-tattoo', label: 'Tattoo' },
      { id: 'sample-other', label: 'Other' },
    ];
  }
  return query<EnquiryType[]>(
    `*[_type == "enquiryType" && !(_id in path("drafts.**")) && defined(label)] | order(order asc, label asc){
      "id": _id, label
    }`,
  );
}

/* ---------- Placeholder content ----------
 * Generic stock images, only used when no Sanity project is configured (e.g. a fresh clone).
 */

function sampleGallery(_docId: string, title: string): Gallery {
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  return {
    title,
    intro: `Placeholder intro text for ${title}. Connect Sanity to show real content.`,
    items: Array.from({ length: 9 }, (_, i) => ({
      id: `${slug}-${i}`,
      title: '',
      pic: picPlaceholder(`${slug}-${i}`, `${title} placeholder ${i + 1}`),
    })),
  };
}

function sampleArtwork(): Gallery {
  return {
    title: 'Artwork',
    intro: 'Placeholder intro text. Connect Sanity to show real pieces.',
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `sample-${i}`,
      title: `Original ${i + 1}`,
      price: 80 + i * 25,
      status: (i === 2 ? 'sold' : 'available') as ArtStatus,
      pic: picPlaceholder(`artwork-${i}`, `Placeholder artwork ${i + 1}`),
    })),
  };
}
