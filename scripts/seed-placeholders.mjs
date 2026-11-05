// One-off: upload the placeholder images (cropped from Sophie's Instagram) into Sanity
// and fill the Flash and Mark Making galleries. Safe to re-run: Sanity de-duplicates
// identical uploads, and each run replaces the gallery's image list.
//
//   npm run seed:placeholders            # do it
//   npm run seed:placeholders -- --dry   # just list what would happen
//
// Needs PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET and SANITY_WRITE_TOKEN (Editor) in .env.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const GALLERIES = {
  'page-flash': [
    ['flash-sheet', 'Repeatable flash sheet of plants, animals and vessels'],
    ['flash-apple-horses-birds', 'Line drawings of an apple, horses and swallows'],
    ['flash-wolf-flowers', 'Running wolf, tulip and daffodil flash'],
    ['flash-horse-bull-dog', 'Black silhouettes of a horse, bull and dog'],
    ['flash-rose-book', 'Dotted rose designs in a flashbook'],
    ['tattoo-hand-designs', 'Hand-poked designs placed on a hand'],
    ['tattoo-fingers', 'Blue hand-poked finger tattoos'],
    ['tattoo-hand', 'Blue hand-poked hand tattoos'],
    ['tattoo-arm', 'Black hand-poked tattoo on an upper arm'],
    ['tattoo-shoulder', 'Red hand-poked tattoo on a shoulder'],
  ],
  'page-mark-making': [
    ['marks-1', 'Four ink plant marks'],
    ['marks-2', 'Three ink seedling marks'],
    ['marks-3', 'Two ink flower stems'],
    ['marks-4', 'Two small ink flowers'],
    ['marks-5', 'Ink poppy and grass marks'],
    ['marks-6', 'Three ink grass stems'],
    ['marks-7', 'Two bold ink flowers'],
  ],
};

const DRY = process.argv.includes('--dry');
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env');
  process.exit(1);
}

const api = `https://${projectId}.api.sanity.io/v2025-02-19`;
const auth = { Authorization: `Bearer ${token}` };

async function upload(name) {
  const file = await readFile(join('public', 'placeholders', `${name}.jpg`));
  const res = await fetch(`${api}/assets/images/${dataset}?filename=${name}.jpg`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'image/jpeg' },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload ${name} failed (${res.status}): ${await res.text()}`);
  return (await res.json()).document._id;
}

async function mutate(mutations) {
  const res = await fetch(`${api}/data/mutate/${dataset}?visibility=sync`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  return res;
}

for (const [docId, items] of Object.entries(GALLERIES)) {
  console.log(`\n${docId}: ${items.length} images`);
  if (DRY) {
    items.forEach(([name]) => console.log(`  would upload ${name}.jpg`));
    continue;
  }
  const images = [];
  for (const [name, alt] of items) {
    const assetId = await upload(name);
    console.log(`  uploaded ${name}.jpg`);
    images.push({ _type: 'image', _key: name, alt, asset: { _type: 'reference', _ref: assetId } });
  }
  // Published document (created earlier in the Studio)…
  const res = await mutate([{ patch: { id: docId, set: { images } } }]);
  if (!res.ok) throw new Error(`Updating ${docId} failed (${res.status}): ${await res.text()}`);
  // …and any open draft, so the Studio shows the same thing. Fails harmlessly if there's no draft.
  await mutate([{ patch: { id: `drafts.${docId}`, set: { images } } }]);
  console.log(`  ${docId} updated`);
}

console.log(DRY ? '\nDry run only, nothing changed.' : '\nDone. Refresh the Studio and the site.');
