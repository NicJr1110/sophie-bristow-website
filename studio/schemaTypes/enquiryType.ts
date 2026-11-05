import { defineField, defineType } from 'sanity';

/** A button on the contact form (e.g. Tattoo, Other), mapped to the auto-reply it sends. */
export const enquiryType = defineType({
  name: 'enquiryType',
  title: 'Enquiry type',
  type: 'document',
  fields: [
    defineField({
      name: 'label',
      title: 'Button label',
      type: 'string',
      description: 'What people see on the contact form, e.g. "Tattoo".',
      validation: (r) => r.required().max(40),
    }),
    defineField({
      name: 'template',
      title: 'Auto-reply email',
      type: 'reference',
      to: [{ type: 'emailTemplate' }],
      description: 'The email sent back to people who pick this. Several enquiry types can share one template.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers show first (left to right, then down).',
      initialValue: 10,
    }),
  ],
  orderings: [{ title: 'Display order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: {
    select: { title: 'label', template: 'template.name', order: 'order' },
    prepare: ({ title, template, order }) => ({
      title,
      subtitle: `${template ? `Sends: ${template}` : 'No template chosen'}${order != null ? ` · order ${order}` : ''}`,
    }),
  },
});
