/**
 * The website's wording: menu and page names, buttons, form labels and messages.
 * Sophie edits these in the Studio (Site text). These are the starting values the Studio
 * pre-fills, and what the website falls back to if a field is ever left empty.
 * Shared by the Studio (studio/schemaTypes/siteText.ts) and the site (src/lib/content.ts).
 */
export const SITE_TEXT_DEFAULTS = {
  // Menu and page names (also the browser tab title and the landing cards)
  navFlash: 'Flash',
  navMarkMaking: 'Mark Making',
  navShop: 'Shop',
  navAbout: 'About',
  navContact: 'Contact',

  // Landing page and shop chooser
  tagline: 'Artist based in Bristol',
  browseLabel: 'Browse',
  shopAllLabel: 'Shop all',

  // Flash and Mark Making galleries
  enquireLabel: 'Enquire',
  swipeHint: 'Swipe',
  emptyGallery: 'Nothing here yet. Check back soon.',

  // Shop
  buyLabel: 'Buy',
  soldLabel: 'Sold',
  allLabel: 'all',
  buyingLabel: 'One moment…',
  justSoldMessage: 'Sorry, that piece has just sold.',
  shopErrorMessage: 'Oops, something appears to have gone wrong. Please try again later.',

  // Contact form
  aboutLabel: 'About:',
  changeLabel: 'change',
  removeLabel: 'remove',
  nameLabel: 'name',
  emailLabel: 'email',
  messagePlaceholder: 'start typing here…',
  sendLabel: 'Send',
  sendingLabel: 'Sending…',
  sentTitle: 'Sent',
  sentMessage: 'Thank you very much, Sophie will be in touch with you shortly.',
  contactErrorMessage: 'Oops, something appears to have gone wrong. Please try again later.',

  // Other pages
  notFoundTitle: 'Page not found',
  homeLink: 'Back to the home page',
  thankYouTitle: 'Thank you',
  thankYouMessage:
    'Your payment went through and the piece is yours. A receipt is on its way to your inbox, and Sophie will be in touch about delivery.',
  cancelledTitle: 'Payment cancelled',
  cancelledMessage: 'No payment was taken.',
  shopLink: 'Back to the shop',

  // Footer and search engines
  footerNote: 'All rights reserved.',
  siteDescription: 'Tattoo design, artwork and mark making by Sophie Bristow.',
};

export type SiteText = typeof SITE_TEXT_DEFAULTS;
