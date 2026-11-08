import type { StructureResolver } from 'sanity/structure';

// Must match DOC_IDS in src/lib/config.ts
export const SINGLETON_TYPES = new Set(['siteSettings', 'bio', 'galleryPage']);

const single = (S: Parameters<StructureResolver>[0], title: string, type: string, id: string) =>
  S.listItem().title(title).id(id).child(S.document().schemaType(type).documentId(id).title(title));

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Website')
    .items([
      single(S, 'Flash', 'galleryPage', 'page-flash'),
      single(S, 'Mark Making', 'galleryPage', 'page-mark-making'),
      S.divider(),
      single(S, 'Shop page intro', 'galleryPage', 'page-artwork'),
      S.documentTypeListItem('artwork').title('Shop items'),
      S.documentTypeListItem('shopTag').title('Shop tags'),
      S.divider(),
      S.listItem()
        .title('Contact form')
        .id('contact-form')
        .child(
          S.list()
            .title('Contact form')
            .items([
              S.documentTypeListItem('enquiryType').title('Enquiry types (form buttons)'),
              S.documentTypeListItem('emailTemplate').title('Auto-reply email templates'),
              single(S, 'Away mode', 'siteSettings', 'siteSettings'),
            ]),
        ),
      S.divider(),
      single(S, 'Bio', 'bio', 'bio'),
      single(S, 'Site settings', 'siteSettings', 'siteSettings'),
    ]);
