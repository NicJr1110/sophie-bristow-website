import { SANITY } from './config';

/** A picture the components can render at any width, whatever its source. */
export type Pic = {
  alt: string;
  /** Square crop for grid tiles (respects the Sanity hotspot). */
  thumb: (w: number) => string;
  /** Uncropped, for the lightbox. */
  full: (w: number) => string;
};

export type SanityImage = {
  asset?: { _ref: string };
  hotspot?: { x: number; y: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
};

/** Grid thumbnail widths for srcset (see spec §1). */
export const THUMB_WIDTHS = [400, 800, 1200];
export const FULL_WIDTH = 2400;

function parseRef(ref: string) {
  // image-<id>-<width>x<height>-<ext>
  const [, id, dims, ext] = ref.split('-');
  const [width, height] = dims.split('x').map(Number);
  return { id, dims, ext, width, height };
}

export function sanityImageUrl(
  image: SanityImage | undefined,
  opts: { w: number; square?: boolean; q?: number },
): string {
  const ref = image?.asset?._ref;
  if (!ref) return '';
  const { id, dims, ext, width, height } = parseRef(ref);
  const p = new URLSearchParams({ w: String(opts.w), auto: 'format', q: String(opts.q ?? 80) });

  if (opts.square) {
    p.set('h', String(opts.w));
    p.set('fit', 'crop');
    if (image!.hotspot) {
      p.set('crop', 'focalpoint');
      p.set('fp-x', image!.hotspot.x.toFixed(3));
      p.set('fp-y', image!.hotspot.y.toFixed(3));
    }
  } else {
    p.set('fit', 'max');
    const c = image!.crop;
    if (c) {
      const rx = Math.round(c.left * width);
      const ry = Math.round(c.top * height);
      const rw = Math.round(width * (1 - c.left - c.right));
      const rh = Math.round(height * (1 - c.top - c.bottom));
      if (rw < width || rh < height) p.set('rect', `${rx},${ry},${rw},${rh}`);
    }
  }
  return `https://cdn.sanity.io/images/${SANITY.projectId}/${SANITY.dataset}/${id}-${dims}.${ext}?${p}`;
}

export function picFromSanity(image: SanityImage | undefined, fallbackAlt = ''): Pic | null {
  if (!image?.asset?._ref) return null;
  return {
    alt: image.alt || fallbackAlt,
    thumb: (w) => sanityImageUrl(image, { w, square: true }),
    full: (w) => sanityImageUrl(image, { w }),
  };
}

/** Placeholder images while Sanity isn't connected. */
export function picPlaceholder(seed: string, alt: string): Pic {
  return {
    alt,
    thumb: (w) => `https://picsum.photos/seed/${seed}/${w}/${w}`,
    full: (w) => `https://picsum.photos/seed/${seed}/${w}/${Math.round(w * 0.75)}`,
  };
}

/**
 * Sophie's own work (cropped from Instagram) in public/placeholders/, used until Sanity has content.
 * Each has <name>.jpg (full, ≤1400px) and <name>-400.jpg / <name>-800.jpg (square thumbs).
 */
export function picLocal(name: string, alt: string): Pic {
  return {
    alt,
    thumb: (w) => `/placeholders/${name}-${w <= 400 ? 400 : 800}.jpg`,
    full: () => `/placeholders/${name}.jpg`,
  };
}

export function srcset(pic: Pic): string {
  return THUMB_WIDTHS.map((w) => `${pic.thumb(w)} ${w}w`).join(', ');
}
