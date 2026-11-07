import { defineField, defineType } from 'sanity';

const SITE_URL = (process.env.SANITY_STUDIO_SITE_URL || 'https://sophiebristow.com').replace(/\/$/, '');
const randomKey = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'launch', title: 'Coming soon', default: true },
    { name: 'shop', title: 'Shop' },
    { name: 'look', title: 'Look' },
    { name: 'away', title: 'Away mode' },
  ],
  fields: [
    defineField({
      name: 'comingSoon',
      title: 'Show "Coming soon" page',
      type: 'boolean',
      group: 'launch',
      initialValue: true,
      description:
        'While this is on, visitors only see a simple holding page. Turn it off and publish to go live. It takes effect within a minute, with nothing else to do.',
    }),
    defineField({
      name: 'comingSoonMessage',
      title: 'Holding page message',
      type: 'string',
      group: 'launch',
      initialValue: 'Coming soon',
    }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram handle',
      type: 'string',
      group: 'launch',
      initialValue: 'sophie_bristow',
      description: 'Shown as a link on the holding page. No @ needed.',
    }),
    defineField({
      name: 'previewKey',
      title: 'Preview key',
      type: 'string',
      group: 'launch',
      initialValue: randomKey,
      validation: (r) =>
        r.regex(/^[A-Za-z0-9_-]{8,128}$/, { name: 'letters, numbers, - or _' }).error('At least 8 letters or numbers.'),
      description: `To see the real site while "Coming soon" is on, open ${SITE_URL}/?preview=<this key> once on each phone or computer. Change the key to lock out old preview links. Add ?preview=off to leave preview.`,
    }),

    defineField({
      name: 'showShop',
      title: 'Show shop (Artwork page)',
      type: 'boolean',
      group: 'shop',
      initialValue: false,
      description:
        'Off: the Artwork page and its menu link are hidden, and nothing can be bought. Turn on and publish once Stripe is live. The menu updates after the site rebuilds (a minute or two).',
    }),
    defineField({
      name: 'background',
      title: 'Background splash image',
      type: 'image',
      group: 'look',
      description: 'Sits in the bottom-right corner of every page. A PNG with a transparent background works best.',
    }),

    defineField({
      name: 'awayMode',
      title: 'Away mode',
      type: 'boolean',
      group: 'away',
      initialValue: false,
      description:
        'Turn on when you’re on holiday. Everyone who uses the contact form gets the away message below, whatever enquiry type they picked.',
    }),
    defineField({
      name: 'awayReplySubject',
      title: 'Away subject',
      type: 'string',
      group: 'away',
      initialValue: 'Away at the moment',
      hidden: ({ document }) => !document?.awayMode,
    }),
    defineField({
      name: 'awayReplyBody',
      title: 'Away message',
      type: 'text',
      rows: 6,
      group: 'away',
      hidden: ({ document }) => !document?.awayMode,
      validation: (r) =>
        r.custom((value, ctx) =>
          (ctx.document as { awayMode?: boolean })?.awayMode && !value ? 'Write an away message, or turn away mode off.' : true,
        ),
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
