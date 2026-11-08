import { defineField, defineType } from 'sanity';

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export const artwork = defineType({
  name: 'artwork',
  title: 'Artwork for sale',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      description: 'Upload a big original. Drag the hotspot to choose what stays in view on the square thumbnail.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (r) => r.required().warning('Please add a short description.'),
        }),
      ],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3, description: 'Optional: size, medium, framing…' }),
    defineField({
      name: 'tags',
      type: 'array',
      description: 'Which shop sections this appears in, e.g. artwork or gift cards. Manage the list under Shop → Shop tags.',
      of: [{ type: 'reference', to: [{ type: 'shopTag' }] }],
    }),
    defineField({
      name: 'price',
      title: 'Price (£)',
      type: 'number',
      description: 'In pounds, e.g. 120 or 85.50.',
      validation: (r) => r.required().positive().precision(2),
    }),
    defineField({
      name: 'status',
      type: 'string',
      initialValue: 'available',
      description:
        'Set automatically when someone buys. "Reserved" means someone is in checkout right now (shown as Sold for up to 30 minutes).',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Reserved', value: 'reserved' },
          { title: 'Sold', value: 'sold' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first. Leave blank to show newest first.',
    }),

    // Managed by the checkout/webhook functions
    defineField({ name: 'reservedUntil', type: 'datetime', readOnly: true, hidden: ({ value }) => !value }),
    defineField({ name: 'soldAt', type: 'datetime', readOnly: true, hidden: ({ value }) => !value }),
    defineField({ name: 'reservedSession', type: 'string', readOnly: true, hidden: true }),
    defineField({ name: 'reservationToken', type: 'string', readOnly: true, hidden: true }),
    defineField({ name: 'soldSession', type: 'string', readOnly: true, hidden: true }),
  ],
  orderings: [{ title: 'Display order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'title', price: 'price', status: 'status', media: 'image' },
    prepare: ({ title, price, status, media }) => ({
      title,
      subtitle: [typeof price === 'number' ? gbp.format(price) : '', status ? status.toUpperCase() : '']
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
});
