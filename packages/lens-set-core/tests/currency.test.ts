import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCurrency, formatPriceAdjustment } from '../src/currency';

describe('currency formatting', () => {
  it('formats configured currencies consistently', () => {
    assert.equal(formatCurrency(12.5, { code: 'GBP', symbol: '£' }), '£12.50');
    assert.equal(formatCurrency(12.5, { code: 'USD', symbol: '$' }), 'US$12.50');
    assert.equal(formatPriceAdjustment(12.5, { code: 'GBP', symbol: '£' }), '+£12.50');
    assert.equal(formatPriceAdjustment(0, { code: 'GBP', symbol: '£' }), 'Included');
  });

  it('falls back to the configured symbol for an invalid currency code', () => {
    assert.equal(formatCurrency(3, { code: 'invalid', symbol: '¤' }), '¤3.00');
  });
});
