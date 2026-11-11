import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePayNowPayload,
  formatPayNowPhone,
  crc16Ccitt,
} from '../dist/utils/paynow.js';

describe('PayNow EMVCo Dynamic QR Generation', () => {
  it('formats Singapore mobile numbers cleanly', () => {
    assert.equal(formatPayNowPhone('91234567'), '+6591234567');
    assert.equal(formatPayNowPhone('81234567'), '+6581234567');
    assert.equal(formatPayNowPhone('+6591234567'), '+6591234567');
    assert.equal(formatPayNowPhone('6591234567'), '+6591234567');
    assert.equal(formatPayNowPhone('9123 4567'), '+6591234567');
    assert.equal(formatPayNowPhone('+65 9123-4567'), '+6591234567');
  });

  it('computes CRC16-CCITT correctly matching test vectors', () => {
    assert.equal(crc16Ccitt('123456789'), '29B1');
  });

  it('generates dynamic PayNow payload for mobile with locked amount and reference', () => {
    const payload = generatePayNowPayload({
      proxyType: 'mobile',
      proxyValue: '91234567',
      amount: 14.80,
      reference: 'NYO-012',
      merchantName: 'NYO PASTA',
    });

    // Check EMVCo format indicator
    assert.ok(payload.startsWith('000201010212'), 'Starts with format indicator and dynamic QR tag 010212');
    // Check PayNow Tag 26
    assert.ok(payload.includes('SG.PAYNOW'), 'Contains PayNow identifier');
    assert.ok(payload.includes('01010'), 'Contains mobile proxy type subtag');
    assert.ok(payload.includes('+6591234567'), 'Contains formatted mobile proxy');
    assert.ok(payload.includes('03010'), 'Contains non-editable/locked amount indicator subtag');
    // Check Amount Tag 54
    assert.ok(payload.includes('540514.80'), 'Contains exact amount 14.80');
    // Check Reference Tag 62 Subtag 01
    assert.ok(payload.includes('62110107NYO-012'), 'Contains reference NYO-012 in tag 62');
    // Check CRC Tag 63
    assert.ok(payload.includes('6304'), 'Contains CRC tag 6304');
    assert.equal(payload.length, payload.indexOf('6304') + 8, 'Has exactly 4 hex characters after 6304');
  });

  it('generates dynamic PayNow payload for corporate UEN with locked amount', () => {
    const payload = generatePayNowPayload({
      proxyType: 'uen',
      proxyValue: '202300000A',
      amount: 8.50,
      reference: 'NYO-099',
      merchantName: 'NYO PASTA',
    });

    assert.ok(payload.includes('01012'), 'Contains UEN proxy type subtag');
    assert.ok(payload.includes('202300000A'), 'Contains UEN proxy value');
    assert.ok(payload.includes('54048.50'), 'Contains amount 8.50');
    assert.ok(payload.includes('NYO-099'), 'Contains order reference');
  });

  it('generates static PayNow payload when amount is omitted', () => {
    const payload = generatePayNowPayload({
      proxyType: 'mobile',
      proxyValue: '91234567',
      merchantName: 'NYO PASTA',
    });

    assert.ok(payload.startsWith('000201010211'), 'Starts with static QR tag 010211');
    assert.ok(!payload.includes('540'), 'Does not contain fixed amount tag');
    assert.ok(payload.includes('03011'), 'Amount is marked editable');
  });
});
