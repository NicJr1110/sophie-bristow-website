import { defineField, defineType } from 'sanity';
import { SITE_TEXT_DEFAULTS, type SiteText } from '../siteTextDefaults';

// The website's wording, in one place. Every field starts with the current wording; if one is
// ever cleared, the website quietly uses that starting wording instead of showing nothing.

type Field = { name: keyof SiteText; title: string; group: string; description?: string; long?: boolean };

const FIELDS: Field[] = [
  // Menu and page names
  { name: 'navFlash', title: 'Flash', group: 'pages' },
  { name: 'navMarkMaking', title: 'Mark Making', group: 'pages' },
  { name: 'navShop', title: 'Shop', group: 'pages' },
  { name: 'navAbout', title: 'About (the bio page)', group: 'pages' },
  { name: 'navContact', title: 'Contact', group: 'pages' },

  // Landing page and shop chooser
  { name: 'tagline', title: 'Line under your name', group: 'landing', description: 'Shown under "Sophie Bristow" on the landing page and the shop chooser.' },
  { name: 'browseLabel', title: '"Browse" on the cards', group: 'landing' },
  { name: 'shopAllLabel', title: 'Link to the whole shop', group: 'landing', description: 'Bottom-left of the shop chooser page.' },

  // Galleries
  { name: 'enquireLabel', title: 'Enquire button', group: 'galleries', description: 'On each Flash and Mark Making image.' },
  { name: 'swipeHint', title: 'Swipe hint', group: 'galleries', description: 'Shown once on phones and tablets when a picture is first opened large.' },
  { name: 'emptyGallery', title: 'When a page has no images yet', group: 'galleries' },

  // Shop
  { name: 'buyLabel', title: 'Buy button', group: 'shop' },
  { name: 'soldLabel', title: 'Sold label', group: 'shop' },
  { name: 'allLabel', title: '"All" in the category filters', group: 'shop' },
  { name: 'buyingLabel', title: 'Buy button while going to checkout', group: 'shop' },
  { name: 'justSoldMessage', title: 'If the piece sold a moment ago', group: 'shop' },
  { name: 'shopErrorMessage', title: 'If checkout can’t start', group: 'shop', long: true },

  // Contact form
  { name: 'aboutLabel', title: 'Before the chosen enquiry type', group: 'contact', description: 'e.g. "About: tattoo"' },
  { name: 'changeLabel', title: 'Change enquiry type link', group: 'contact' },
  { name: 'removeLabel', title: 'Remove the attached image link', group: 'contact' },
  { name: 'nameLabel', title: 'Name label', group: 'contact' },
  { name: 'emailLabel', title: 'Email label', group: 'contact' },
  { name: 'messagePlaceholder', title: 'Message box hint', group: 'contact' },
  { name: 'sendLabel', title: 'Send button', group: 'contact' },
  { name: 'sendingLabel', title: 'Send button while sending', group: 'contact' },
  { name: 'sentTitle', title: 'Heading once sent', group: 'contact' },
  { name: 'sentMessage', title: 'Message once sent', group: 'contact', long: true },
  { name: 'contactErrorMessage', title: 'If sending fails', group: 'contact', long: true },

  // Other pages
  { name: 'notFoundTitle', title: 'Page not found: heading', group: 'other' },
  { name: 'homeLink', title: 'Page not found: link home', group: 'other' },
  { name: 'thankYouTitle', title: 'After paying: heading', group: 'other' },
  { name: 'thankYouMessage', title: 'After paying: message', group: 'other', long: true },
  { name: 'cancelledTitle', title: 'Payment cancelled: heading', group: 'other' },
  { name: 'cancelledMessage', title: 'Payment cancelled: message', group: 'other', long: true },
  { name: 'shopLink', title: 'Link back to the shop', group: 'other', description: 'On both payment pages.' },

  // Footer and search
  { name: 'footerNote', title: 'Footer', group: 'footer', description: 'After "© 2026 Sophie Bristow." (the year updates itself).' },
  { name: 'siteDescription', title: 'Description for search engines', group: 'footer', description: 'The short summary Google shows under the site’s name.', long: true },
];

export const siteText = defineType({
  name: 'siteText',
  title: 'Site text',
  type: 'document',
  groups: [
    { name: 'pages', title: 'Page names', default: true },
    { name: 'landing', title: 'Landing page' },
    { name: 'galleries', title: 'Galleries' },
    { name: 'shop', title: 'Shop' },
    { name: 'contact', title: 'Contact form' },
    { name: 'other', title: 'Other pages' },
    { name: 'footer', title: 'Footer & search' },
  ],
  fields: FIELDS.map((f) =>
    defineField({
      name: f.name,
      title: f.title,
      type: f.long ? 'text' : 'string',
      ...(f.long ? { rows: 3 } : {}),
      group: f.group,
      description:
        f.group === 'pages'
          ? 'Used in the menus, the browser tab and the landing page cards.'
          : f.description,
      initialValue: SITE_TEXT_DEFAULTS[f.name],
      validation: (r) => r.required().warning(`Empty: the site will show "${SITE_TEXT_DEFAULTS[f.name]}".`),
    }),
  ),
  preview: { prepare: () => ({ title: 'Site text' }) },
});
