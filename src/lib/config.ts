export const SITE_NAME = 'Sophie Bristow';

/** Show Sophie's S/B monogram (public/sb-logo.png), small, instead of her name in the header. The landing page shows her name in full. */
export const USE_MONOGRAM = true;

export const SANITY = {
  projectId: (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) || '',
  dataset: (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production',
  apiVersion: '2025-02-19',
};

// Menu order everywhere: Flash, Mark Making, Shop, About (the bio page), Contact.
// The names come from Site text in the Studio (see getNav in content.ts).
export const NAV = [
  { href: '/flash/', text: 'navFlash' },
  { href: '/mark-making/', text: 'navMarkMaking' },
  { href: '/shop/', text: 'navShop' },
  { href: '/bio/', text: 'navAbout' },
  { href: '/contact/', text: 'navContact' },
] as const;

// Fixed Sanity document IDs (singletons), matching studio/structure.ts
export const DOC_IDS = {
  siteText: 'siteText',
  flash: 'page-flash',
  markMaking: 'page-mark-making',
  artwork: 'page-artwork',
  bio: 'bio',
  settings: 'siteSettings',
} as const;
