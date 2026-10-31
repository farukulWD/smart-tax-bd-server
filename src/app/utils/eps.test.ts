import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { generateEpsHash, generateMerchantTransactionId } from './eps';

describe('EPS helpers', () => {
  it('signs with base64 HMAC-SHA512 keyed by the UTF-8 hash key', () => {
    const key = 'FHZxyzeps56789gfhg678ygu876o=';
    const expected = crypto
      .createHmac('sha512', Buffer.from(key, 'utf8'))
      .update('Epsdemo@gmail.com', 'utf8')
      .digest('base64');

    assert.equal(generateEpsHash('Epsdemo@gmail.com', key), expected);
    assert.equal(Buffer.from(expected, 'base64').length, 64);
  });

  it('generates unique numeric merchant transaction IDs of 10+ digits', () => {
    const ids = Array.from({ length: 200 }, generateMerchantTransactionId);
    for (const id of ids) {
      assert.match(id, /^\d{10,}$/);
    }
    assert.ok(new Set(ids).size > 190);
  });
});
