import { defineArrayMember, defineField, defineType } from 'sanity';

export const galleryPage = defineType({
  name: 'galleryPage',
  title: 'Gallery page',
  type: 'document',
  fields: [
    // The page's name now lives in Site text → Page names (one place for the menus, tab titles
    // and landing cards). Kept here, hidden, so earlier content isn't lost.
    defineField({ name: 'title', type: 'string', hidden: true }),
    defineField({
      name: 'subtitle',
      title: 'Card subtitle',
      type: 'string',
      description: 'One short line shown under this page\'s name on the landing page.',
      validation: (r) => r.max(90),
      // The shop's cards take their subtitles from the shop tags instead
      hidden: ({ document }) => Boolean(document?._id?.endsWith('page-artwork')),
    }),
    defineField({
      name: 'introText',
      title: 'Intro text',
      type: 'text',
      rows: 4,
      description: 'Shown at the top of the page, above the images.',
    }),
    defineField({
      name: 'enquiryType',
      title: 'Enquiry type',
      type: 'reference',
      to: [{ type: 'enquiryType' }],
      description:
        'When someone presses "Enquire" on one of these images, the contact form opens with this enquiry type already chosen (e.g. Tattoo for Flash). Leave empty to let them choose.',
      hidden: ({ document }) => Boolean(document?._id?.endsWith('page-artwork')),
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
