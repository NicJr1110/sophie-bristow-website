import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'look', title: 'Look', default: true },
    { name: 'reply', title: 'Contact auto-reply' },
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
      name: 'autoReplySubject',
      title: 'Auto-reply subject',
      type: 'string',
      group: 'reply',
      initialValue: 'Thanks for getting in touch',
    }),
    defineField({
      name: 'autoReplyBody',
      title: 'Auto-reply message',
      type: 'text',
      rows: 6,
      group: 'reply',
      description: 'Sent automatically to anyone who uses the contact form.',
    }),
    defineField({
      name: 'awayMode',
      title: 'Away mode',
      type: 'boolean',
      group: 'reply',
      initialValue: false,
      description: 'Turn on when you’re on holiday. People get the away message below instead.',
    }),
    defineField({
      name: 'awayReplySubject',
      title: 'Away subject',
      type: 'string',
      group: 'reply',
      hidden: ({ document }) => !document?.awayMode,
    }),
    defineField({
      name: 'awayReplyBody',
      title: 'Away message',
      type: 'text',
      rows: 6,
      group: 'reply',
      hidden: ({ document }) => !document?.awayMode,
      validation: (r) =>
        r.custom((value, ctx) =>
          (ctx.document as { awayMode?: boolean })?.awayMode && !value ? 'Write an away message, or turn away mode off.' : true,
        ),
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
