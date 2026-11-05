import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { toStripeForm, verifyStripeSignature } from '../server/stripe.ts';
import { isAvailable, isValidArtworkId, publicStatus, toPence } from '../server/artwork.ts';
import { portableTextToHtml } from '../src/lib/portableText.ts';

const SECRET = 'whsec_test_secret';
const sign = (payload: string, t: number, secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

test('accepts a valid Stripe signature', async () => {
  const now = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  assert.equal(await verifyStripeSignature(body, sign(body, now), SECRET, 300, now), true);
});

test('accepts when one of several v1 signatures matches (secret rotation)', async () => {
  const now = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  const header = `t=${now},v1=deadbeef,${sign(body, now).split(',')[1]}`;
  assert.equal(await verifyStripeSignature(body, header, SECRET, 300, now), true);
});

test('rejects a tampered body, wrong secret, old timestamp or missing header', async () => {
  const now = 1_800_000_000;
  const body = '{"id":"evt_1"}';
  assert.equal(await verifyStripeSignature('{"id":"evt_2"}', sign(body, now), SECRET, 300, now), false);
  assert.equal(await verifyStripeSignature(body, sign(body, now, 'whsec_other'), SECRET, 300, now), false);
  assert.equal(await verifyStripeSignature(body, sign(body, now - 301), SECRET, 300, now), false);
  assert.equal(await verifyStripeSignature(body, null, SECRET, 300, now), false);
  assert.equal(await verifyStripeSignature(body, 'garbage', SECRET, 300, now), false);
});

test('encodes nested params the way Stripe expects', () => {
  const form = toStripeForm({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: 12000, product_data: { name: 'A & B' } } }],
    shipping_address_collection: { allowed_countries: ['GB'] },
    metadata: { artworkId: 'abc' },
    skipped: undefined,
  });
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '12000');
  assert.equal(form.get('line_items[0][price_data][product_data][name]'), 'A & B');
  assert.equal(form.get('shipping_address_collection[allowed_countries][0]'), 'GB');
  assert.equal(form.get('metadata[artworkId]'), 'abc');
  assert.equal(form.has('skipped'), false);
});

test('reservation logic: reserved shows as sold until it lapses', () => {
  const now = Date.parse('2026-11-05T20:00:00Z');
  const future = '2026-11-05T20:20:00Z';
  const past = '2026-11-05T19:00:00Z';
  assert.equal(isAvailable({ status: 'available' }, now), true);
  assert.equal(isAvailable({ status: 'sold' }, now), false);
  assert.equal(isAvailable({ status: 'reserved', reservedUntil: future }, now), false);
  assert.equal(isAvailable({ status: 'reserved', reservedUntil: past }, now), true);
  assert.equal(publicStatus({ status: 'reserved', reservedUntil: future }, now), 'sold');
  assert.equal(publicStatus({ status: 'reserved', reservedUntil: past }, now), 'available');
});

test('artwork IDs and prices', () => {
  assert.equal(isValidArtworkId('a1b2-c3.d4_e5'), true);
  assert.equal(isValidArtworkId('drafts.abc'), false);
  assert.equal(isValidArtworkId('abc"]{ _id }'), false);
  assert.equal(isValidArtworkId(123), false);
  assert.equal(toPence(85.5), 8550);
  assert.equal(toPence(19.99), 1999);
});

test('bio rich text renders and escapes safely', () => {
  const html = portableTextToHtml([
    { _type: 'block', style: 'h2', children: [{ _type: 'span', text: 'About' }] },
    {
      _type: 'block',
      style: 'normal',
      markDefs: [{ _key: 'l1', _type: 'link', href: 'https://instagram.com' }, { _key: 'l2', _type: 'link', href: 'javascript:alert(1)' }],
      children: [
        { _type: 'span', text: '<b>Hi</b> ', marks: ['strong'] },
        { _type: 'span', text: 'insta', marks: ['l1'] },
        { _type: 'span', text: ' bad', marks: ['l2'] },
      ],
    },
    { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'one' }] },
    { _type: 'block', listItem: 'bullet', children: [{ _type: 'span', text: 'two' }] },
  ]);
  assert.equal(
    html,
    '<h2>About</h2><p><strong>&lt;b&gt;Hi&lt;/b&gt; </strong><a href="https://instagram.com" target="_blank" rel="noopener">insta</a> bad</p><ul><li>one</li><li>two</li></ul>',
  );
});
