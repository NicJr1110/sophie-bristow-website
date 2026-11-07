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
      name: 'sendTo',
      title: 'Send enquiries to',
      type: 'email',
      description:
        'Which inbox gets these enquiries, e.g. your tattoo Gmail. Replies to the auto-reply go here too. Leave empty to use your main inbox.',
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
    select: { title: 'label', template: 'template.name', sendTo: 'sendTo' },
    prepare: ({ title, template, sendTo }) => ({
      title,
      subtitle: `→ ${sendTo || 'main inbox'} · ${template ? `replies with "${template}"` : 'no template chosen'}`,
    }),
  },
});
