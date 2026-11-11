import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE_TEXT_DEFAULTS } from '../studio/siteTextDefaults.ts';

test('Site text: every piece of wording has a Studio field, and every field has starting wording', () => {
  const schema = readFileSync(new URL('../studio/schemaTypes/siteText.ts', import.meta.url), 'utf8');
  const fields = [...schema.matchAll(/\{ name: '(\w+)'[^}\n]*group:/g)].map((m) => m[1]).sort();
  assert.deepEqual(fields, Object.keys(SITE_TEXT_DEFAULTS).sort());
  for (const [key, value] of Object.entries(SITE_TEXT_DEFAULTS)) assert.ok(value.trim(), `${key} has no starting wording`);
});

test('Site text: every name the site looks up exists', () => {
  const used = new Set<string>();
  for (const file of ['src/lib/config.ts', 'src/lib/content.ts', 'src/layouts/Base.astro', 'src/components/Gallery.astro', 'src/components/Header.astro', 'src/components/SimplePageShell.astro', 'src/pages/contact.astro', 'src/pages/shop.astro', 'src/pages/shop-options.astro', 'src/pages/index.astro', 'src/pages/404.astro', 'src/pages/thank-you.astro', 'src/pages/checkout-cancelled.astro']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/\btext\.(\w+)/g)) used.add(m[1]);
    for (const m of src.matchAll(/text: '(\w+)'/g)) used.add(m[1]);
  }
  for (const key of used) assert.ok(key in SITE_TEXT_DEFAULTS, `${key} is used but not defined`);
});
