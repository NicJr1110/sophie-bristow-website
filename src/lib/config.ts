export const SITE_NAME = 'Sophie Bristow';

/** Show Sophie's S/B monogram (public/sb-logo.png), small, instead of her name in the header. The landing page shows her name in full. */
export const USE_MONOGRAM = true;

export const SANITY = {
  projectId: (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) || '',
  dataset: (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production',
  apiVersion: '2025-02-19',
};

// Menu order everywhere: Flash, Mark Making, Shop, About (the bio page), Contact.
export const NAV = [
  { href: '/flash/', label: 'Flash' },
  { href: '/mark-making/', label: 'Mark Making' },
  { href: '/shop/', label: 'Shop' },
  { href: '/bio/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
] as const;

// Fixed Sanity document IDs (singletons), matching studio/structure.ts
export const DOC_IDS = {
  flash: 'page-flash',
  markMaking: 'page-mark-making',
  artwork: 'page-artwork',
  bio: 'bio',
  settings: 'siteSettings',
} as const;
