import { defineField, defineType } from 'sanity';

/** A shop category, e.g. "artwork" or "gift cards". Shown in the Shop menus, as a card on the shop chooser page, and as filters on the shop. */
export const shopTag = defineType({
  name: 'shopTag',
  title: 'Shop tag',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'As it appears on the site, e.g. "artwork" or "gift cards". Only shows once at least one shop item uses it.',
      validation: (r) => r.required().max(30),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description: 'Used in the link, e.g. /shop/?tag=gift-cards. Click Generate.',
      options: { source: 'title', maxLength: 40 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Card subtitle',
      type: 'string',
      description: 'One short line shown under this tag on the shop page that lets people choose, e.g. "Give the gift of art."',
      validation: (r) => r.max(90),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first. "all" always comes last.',
      initialValue: 10,
    }),
  ],
  orderings: [{ title: 'Display order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
