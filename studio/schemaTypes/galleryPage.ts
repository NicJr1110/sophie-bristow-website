import { defineArrayMember, defineField, defineType } from 'sanity';

export const galleryPage = defineType({
  name: 'galleryPage',
  title: 'Gallery page',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'introText',
      title: 'Intro text',
      type: 'text',
      rows: 4,
      description: 'Shown at the top of the page, above the images.',
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'Drag to reorder. Upload big originals (around 3000px on the longest side). The site resizes them.',
      // The Artwork page lists its pieces separately under "Artworks for sale"
      hidden: ({ document }) => Boolean(document?._id?.endsWith('page-artwork')),
      options: { layout: 'grid' },
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'title', type: 'string', description: 'Optional caption shown in the large view.' }),
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Short description for screen readers and search engines, e.g. "Black and grey snake flash".',
              validation: (r) => r.required().warning('Please add a short description.'),
            }),
          ],
        }),
      ],
    }),
  ],
});
