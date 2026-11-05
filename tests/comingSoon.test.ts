import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comingSoonHtml, decide, readCookie } from '../server/comingSoon.ts';

const on = { comingSoon: true, previewKey: 'abc123def456', instagramHandle: 'sophie_bristow' };
const u = (path: string) => new URL(`https://example.com${path}`);

test('switch off or settings missing → real site', () => {
  assert.deepEqual(decide(u('/'), null, { comingSoon: false }), { kind: 'site' });
  assert.deepEqual(decide(u('/'), null, null), { kind: 'site' });
});

test('switch on → coming soon for every page, but never the API', () => {
  assert.deepEqual(decide(u('/'), null, on), { kind: 'coming-soon' });
  assert.deepEqual(decide(u('/artwork/'), null, on), { kind: 'coming-soon' });
  assert.deepEqual(decide(u('/api/stripe-webhook'), null, on), { kind: 'site' });
  assert.deepEqual(decide(u('/api/contact'), null, on), { kind: 'site' });
});

test('preview link sets a cookie; cookie shows the real site; wrong key does not', () => {
  assert.deepEqual(decide(u('/?preview=abc123def456'), null, on), { kind: 'enter-preview', key: 'abc123def456' });
  assert.deepEqual(decide(u('/flash/'), 'x=1; sb_preview=abc123def456', on), { kind: 'site' });
  assert.deepEqual(decide(u('/?preview=wrong'), null, on), { kind: 'coming-soon' });
  assert.deepEqual(decide(u('/'), 'sb_preview=wrong', on), { kind: 'coming-soon' });
  assert.deepEqual(decide(u('/?preview=off'), 'sb_preview=abc123def456', on), { kind: 'exit-preview' });
});

test('a missing or too-short preview key never grants access', () => {
  assert.deepEqual(decide(u('/?preview='), null, { comingSoon: true }), { kind: 'coming-soon' });
  assert.deepEqual(decide(u('/?preview=short'), 'sb_preview=short', { comingSoon: true, previewKey: 'short' }), {
    kind: 'coming-soon',
  });
});

test('holding page shows name, message and an escaped Instagram link', () => {
  const html = comingSoonHtml({ ...on, comingSoonMessage: 'Coming <soon>' });
  assert.match(html, /Sophie Bristow/);
  assert.match(html, /Coming &lt;soon&gt;/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/sophie_bristow\/"/);
  assert.match(html, /noindex/);
  assert.match(comingSoonHtml({ comingSoon: true, instagramHandle: '@sophie_bristow' }), /@sophie_bristow</);
  assert.match(comingSoonHtml(null), /Coming soon/);
});

test('reads cookies', () => {
  assert.equal(readCookie('a=1; sb_preview=xyz; b=2', 'sb_preview'), 'xyz');
  assert.equal(readCookie(null, 'sb_preview'), null);
});
