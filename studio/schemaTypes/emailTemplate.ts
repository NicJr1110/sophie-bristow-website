import { defineField, defineType } from 'sanity';

/** An auto-reply sent to whoever fills in the contact form. Linked to enquiry types. */
export const emailTemplate = defineType({
  name: 'emailTemplate',
  title: 'Email template',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Template name',
      type: 'string',
      description: 'Just for you, e.g. "Tattoo reply". People never see this.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'subject',
      title: 'Email subject',
      type: 'string',
      initialValue: 'Thanks for getting in touch',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'body',
      title: 'Email message',
      type: 'text',
      rows: 10,
      description: 'Leave a blank line between paragraphs.',
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'subject' } },
});
