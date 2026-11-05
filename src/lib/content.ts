import { DOC_IDS, SANITY } from './config';
import { picFromSanity, picLocal, picPlaceholder, sanityImageUrl, type Pic, type SanityImage } from './images';
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
 * Sophie's own work, cropped from her Instagram (public/placeholders/), shown until Sanity is connected.
 */

const SAMPLE_GALLERIES: Record<string, [string, string][]> = {
  [DOC_IDS.flash]: [
    ['flash-sheet', 'Repeatable flash sheet of plants, animals and vessels'],
    ['flash-apple-horses-birds', 'Line drawings of an apple, horses and swallows'],
    ['flash-wolf-flowers', 'Running wolf, tulip and daffodil flash'],
    ['flash-horse-bull-dog', 'Black silhouettes of a horse, bull and dog'],
    ['flash-rose-book', 'Dotted rose designs in a flashbook'],
    ['tattoo-hand-designs', 'Hand-poked designs placed on a hand'],
    ['tattoo-fingers', 'Blue hand-poked finger tattoos'],
    ['tattoo-hand', 'Blue hand-poked hand tattoos'],
    ['tattoo-arm', 'Black hand-poked tattoo on an upper arm'],
    ['tattoo-shoulder', 'Red hand-poked tattoo on a shoulder'],
  ],
  [DOC_IDS.markMaking]: [
    ['marks-1', 'Four ink plant marks'],
    ['marks-2', 'Three ink seedling marks'],
    ['marks-3', 'Two ink flower stems'],
    ['marks-4', 'Two small ink flowers'],
    ['marks-5', 'Ink poppy and grass marks'],
    ['marks-6', 'Three ink grass stems'],
    ['marks-7', 'Two bold ink flowers'],
  ],
};

function sampleGallery(docId: string, title: string): Gallery {
  const items = SAMPLE_GALLERIES[docId] ?? [];
  return {
    title,
    intro: `Placeholder intro text for ${title}. Sophie will write this in the CMS.`,
    items: items.map(([name, alt]) => ({ id: name, title: '', pic: picLocal(name, alt) })),
  };
}

function sampleArtwork(): Gallery {
  const pieces: [string, string, number, ArtStatus][] = [
    ['marks-1', 'Plant study I', 120, 'available'],
    ['flash-horse-bull-dog', 'Animals', 150, 'available'],
    ['marks-5', 'Poppy and grass', 95, 'sold'],
    ['flash-apple-horses-birds', 'Apple and swallows', 140, 'available'],
    ['marks-7', 'Two flowers', 110, 'available'],
    ['flash-wolf-flowers', 'Wolf and tulips', 135, 'available'],
  ];
  return {
    title: 'Artwork',
    intro: 'Placeholder intro text. Original pieces, each one-of-a-kind.',
    items: pieces.map(([name, title, price, status], i) => ({
      id: `sample-${i}`,
      title,
      price,
      status,
      pic: picLocal(name, title),
    })),
  };
}
