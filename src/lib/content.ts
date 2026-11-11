import { DOC_IDS, NAV, SANITY } from './config';
import { picFromSanity, picPlaceholder, sanityImageUrl, type Pic, type SanityImage } from './images';
import { portableTextToHtml } from './portableText';

export type ArtStatus = 'available' | 'sold';

export type GalleryItem = {
  id: string;
  title?: string;
  pic: Pic;
  /** Flash / Mark Making: link to the contact form about this piece. */
  enquireHref?: string;
  // Shop only
  price?: number;
  tags?: string[];
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

export type Settings = { backgroundUrl: string; showShop: boolean };
let settingsPromise: Promise<Settings> | null = null;

export function getSettings(): Promise<Settings> {
  settingsPromise ??= (async () => {
    // Without Sanity (fresh clone) show everything, so the whole site can be worked on.
    if (!hasSanity) return { backgroundUrl: '/splash-flower.png', showShop: true };
    const s = await query<{ background?: SanityImage; showShop?: boolean } | null>(
      `*[_id == $id][0]{ background, showShop }`,
      { id: DOC_IDS.settings },
    );
    return {
      backgroundUrl: sanityImageUrl(s?.background, { w: 1600 }) || '/splash-flower.png',
      // Shop is off unless Sophie has switched it on ("Show shop" in Site settings).
      showShop: s?.showShop === true,
    };
  })();
  return settingsPromise;
}

/** Menu items, without Shop while the shop is switched off. */
export async function getNav() {
  const { showShop } = await getSettings();
  return NAV.filter((item) => showShop || item.href !== '/shop/');
}

/* ---------- Landing page choices ---------- */

export type Choice = { label: string; href: string; subtitle: string };

// Shown until Sophie writes her own (Flash page / Mark Making page → "Card subtitle" in the Studio).
const DEFAULT_SUBTITLES = {
  flash: 'Browse available artworks ready for purchase.',
  markMaking: 'Commission a unique artwork created specifically for your space.',
};

/** The two cards on the landing page: Flash and Mark Making, each with a short subtitle. */
export async function getLandingChoices(): Promise<Choice[]> {
  const doc = hasSanity
    ? await query<{
        flash?: string;
        markMaking?: string;
        // Earlier versions kept these two in Site settings; still read so nothing is lost.
        legacy?: { flashSubtitle?: string; markMakingSubtitle?: string };
      } | null>(
        `{
          "flash": *[_id == $flash][0].subtitle,
          "markMaking": *[_id == $markMaking][0].subtitle,
          "legacy": *[_id == $settings][0]{ flashSubtitle, markMakingSubtitle }
        }`,
        { flash: DOC_IDS.flash, markMaking: DOC_IDS.markMaking, settings: DOC_IDS.settings },
      )
    : null;
  const label = (href: string) => NAV.find((n) => n.href === href)?.label ?? '';
  return [
    {
      label: label('/flash/'),
      href: '/flash/',
      subtitle: doc?.flash || doc?.legacy?.flashSubtitle || DEFAULT_SUBTITLES.flash,
    },
    {
      label: label('/mark-making/'),
      href: '/mark-making/',
      subtitle: doc?.markMaking || doc?.legacy?.markMakingSubtitle || DEFAULT_SUBTITLES.markMaking,
    },
  ];
}

/* ---------- Galleries (Flash, Mark Making) ---------- */

type GalleryDoc = {
  title?: string;
  introText?: string;
  enquiryType?: string;
  images?: (SanityImage & { _key: string; title?: string })[];
};

/** A gallery image as the contact form refers to it: "<page id>:<image key>", e.g. "page-flash:3f9a1c". */
export const pieceRef = (pageId: string, key: string) => `${pageId}:${key}`;
export const PIECE_REF_RE = /^(page-[a-z0-9-]{1,40}):([A-Za-z0-9_-]{1,64})$/;

/** The contact link for a piece, with the page's enquiry type (Studio → page → "Enquiry type") chosen. */
export function enquireHref(pageId: string, key: string, enquiryType?: string): string {
  const p = new URLSearchParams();
  if (enquiryType) p.set('about', enquiryType);
  p.set('piece', pieceRef(pageId, key));
  return `/contact/?${p}`;
}

export async function getGallery(docId: string, fallbackTitle: string): Promise<Gallery> {
  if (!hasSanity) return sampleGallery(docId, fallbackTitle);
  const doc = await query<GalleryDoc | null>(
    `*[_id == $id][0]{ title, introText, "enquiryType": enquiryType._ref, images }`,
    { id: docId },
  );
  const items: GalleryItem[] = [];
  for (const img of doc?.images ?? []) {
    const pic = picFromSanity(img, img.title ?? '');
    if (pic) items.push({ id: img._key, title: img.title, pic, enquireHref: enquireHref(docId, img._key, doc?.enquiryType) });
  }
  return { title: doc?.title || fallbackTitle, intro: doc?.introText ?? '', items };
}

export type Piece = { ref: string; page: string; title: string; thumb: string };

/** Every Flash and Mark Making image, for the contact form's "about this piece" reference. */
export async function getEnquirePieces(): Promise<Piece[]> {
  const pages = [
    { id: DOC_IDS.flash, title: NAV.find((n) => n.href === '/flash/')?.label ?? 'Flash' },
    { id: DOC_IDS.markMaking, title: NAV.find((n) => n.href === '/mark-making/')?.label ?? 'Mark Making' },
  ];
  const pieces: Piece[] = [];
  for (const page of pages) {
    const gallery = await getGallery(page.id, page.title);
    for (const item of gallery.items) {
      pieces.push({
        ref: pieceRef(page.id, item.id),
        page: gallery.title,
        title: item.title || item.pic.alt || 'Untitled',
        thumb: item.pic.thumb(160),
      });
    }
  }
  return pieces;
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
  tags?: (string | null)[];
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
        _id, title, description, price, status, reservedUntil, image, "tags": tags[]->slug.current
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
      tags: (d.tags ?? []).filter((t): t is string => Boolean(t)),
      pic,
    });
  }
  return { title: page?.title || 'Shop', intro: page?.introText ?? '', items };
}

/* ---------- Shop tags ---------- */

export type ShopTag = { title: string; slug: string; subtitle?: string };

/** Shop tags in display order, only those used by at least one published shop item. */
export async function getShopTags(): Promise<ShopTag[]> {
  if (!hasSanity) {
    return [
      { title: 'artwork', slug: 'artwork', subtitle: 'Original artworks.' },
      { title: 'gift cards', slug: 'gift-cards', subtitle: 'Give the gift of art.' },
    ];
  }
  return query<ShopTag[]>(
    `*[_type == "shopTag" && !(_id in path("drafts.**")) && defined(slug.current)
       && count(*[_type == "artwork" && !(_id in path("drafts.**")) && references(^._id)]) > 0
     ] | order(order asc, title asc){ title, "slug": slug.current, subtitle }`,
  );
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

function sampleGallery(docId: string, title: string): Gallery {
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  return {
    title,
    intro: `Placeholder intro text for ${title}. Connect Sanity to show real content.`,
    items: Array.from({ length: 9 }, (_, i) => ({
      id: `${slug}-${i}`,
      title: '',
      pic: picPlaceholder(`${slug}-${i}`, `${title} placeholder ${i + 1}`),
      enquireHref: enquireHref(docId, `${slug}-${i}`),
    })),
  };
}

function sampleArtwork(): Gallery {
  return {
    title: 'Shop',
    intro: 'Placeholder intro text. Connect Sanity to show real pieces.',
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `sample-${i}`,
      title: i < 2 ? `Gift card ${i + 1}` : `Original ${i + 1}`,
      tags: [i < 2 ? 'gift-cards' : 'artwork'],
      price: 80 + i * 25,
      status: (i === 2 ? 'sold' : 'available') as ArtStatus,
      pic: picPlaceholder(`artwork-${i}`, `Placeholder artwork ${i + 1}`),
    })),
  };
}
