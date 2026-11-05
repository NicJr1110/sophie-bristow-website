import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'look', title: 'Look', default: true },
    { name: 'away', title: 'Away mode' },
  ],
  fields: [
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
