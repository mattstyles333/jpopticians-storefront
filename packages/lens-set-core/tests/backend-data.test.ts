import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backendData, createBackendData } from '../src/backend-data';
import type { LensConfig } from '../src/types';
import { createLensConfig } from '../src/lens-config';

function createGlazingOnlyConfig(): LensConfig {
  return {
    version: 'test',
    currency: {
      symbol: '£',
      code: 'GBP',
    },
    basePrice: 0,
    steps: [],
    options: {
      'glazing-route': {
        title: 'Lens glazing',
        required: true,
        type: 'radio',
        magentoCode: 'glazing_route',
        options: [
          {
            id: 'spex4less',
            title: 'Spex4Less glazing',
            price: 0,
            magentoCode: 'glazing_route',
          },
          {
            id: 'maui-jim-sun',
            title: 'Official Maui Jim sun lenses',
            price: 0,
            magentoCode: 'glazing_route',
          },
        ],
      },
    },
  };
}

function initGlazingRouteMerge(itemSkus: string[]) {
  backendData.init({
    lenses: {
      custom_options: [
        {
          sku: 'glazing_route',
          title: 'Lens glazing',
          type: 'drop_down',
          is_require: '1',
          items: itemSkus.map((sku) => ({ sku, title: sku, price: '0' })),
        },
      ],
    },
  });
}

describe('backend data merge', () => {
  it('replaces backend state on init instead of retaining stale fields', () => {
    backendData.init({ frame: { supplier_glazing_routes: 'rayban-sun' } });
    assert.deepEqual(backendData.getSupplierGlazingRoutes(), ['rayban-sun']);

    backendData.init({});
    assert.deepEqual(backendData.getSupplierGlazingRoutes(), []);
  });

  it('provides demo frame defaults when no backend payload is present', () => {
    backendData.init({});

    assert.equal(backendData.getFrameSku(), 'FRAME-DEMO-001');
    assert.equal(backendData.getFrameName(), 'Demo Frame');
    assert.equal(backendData.getLensesSku(), 'LENS-GENERIC-001');
  });

  it('tolerates known supplier glazing routes that are missing from a local option config', () => {
    const config = createGlazingOnlyConfig();
    initGlazingRouteMerge(['spex4less', 'maui-jim-sun', 'rayban-sun', 'rayban-ophthalmic', 'oakley-sun', 'oakley-ophthalmic']);

    assert.doesNotThrow(() => backendData.mergeBackendLensConfig(config));
  });

  it('normalizes legacy ophthalmic route names from backend frame data', () => {
    backendData.init({
      frame: {
        supplier_glazing_routes: 'rayban-ophthalmic,oakley-ophthalmic,rayban-sun,unknown-route,spex4less',
      },
    });

    assert.deepEqual(backendData.getSupplierGlazingRoutes(), ['rayban-optical', 'oakley-optical', 'rayban-sun']);
  });

  it('still rejects unknown backend selections', () => {
    const config = createGlazingOnlyConfig();
    initGlazingRouteMerge(['spex4less', 'unknown-supplier-route']);

    assert.throws(() => backendData.mergeBackendLensConfig(config), /unknown-supplier-route/);
  });

  it('does not let backend option data overwrite fixed supplier matrix prices', () => {
    const config: LensConfig = {
      version: 'test',
      currency: {
        symbol: '£',
        code: 'GBP',
      },
      basePrice: 0,
      steps: [],
      options: {
        'luxottica-lens-option': {
          title: 'Branded lens option',
          required: true,
          type: 'radio',
          magentoCode: 'luxottica_lens_option',
          options: [
            {
              id: 'rayban-sun-single-vision-tint',
              title: 'Tinted single vision',
              price: 159,
              magentoCode: 'luxottica_lens_option',
            },
          ],
        },
      },
    };

    backendData.init({
      lenses: {
        custom_options: [
          {
            sku: 'luxottica_lens_option',
            title: 'Backend title',
            type: 'drop_down',
            is_require: '1',
            items: [{ sku: 'rayban-sun-single-vision-tint', title: 'Backend item', price: '1' }],
          },
        ],
      },
    });

    const merged = backendData.mergeBackendLensConfig(config);

    assert.equal(merged.options['luxottica-lens-option'].title, 'Branded lens option');
    assert.equal(merged.options['luxottica-lens-option'].options[0].title, 'Tinted single vision');
    assert.equal(merged.options['luxottica-lens-option'].options[0].price, 159);
  });

  it('uses Magento as the source of truth for standard lens type labels and prices', () => {
    const backend = createBackendData({
      lenses: {
        custom_options: [
          {
            sku: 'use_case',
            title: 'Backend use case',
            type: 'drop_down',
            is_require: '0',
            items: ['distance', 'reading', 'intermediate', 'bifocal', 'varifocal', 'occupational', 'frame-only', 'fashion-lenses']
              .map((sku) => ({ sku, title: `Backend ${sku}`, price: sku === 'fashion-lenses' ? '10' : '0' })),
          },
        ],
      },
    });

    const merged = createLensConfig(backend);
    const options = merged.options['use-case'].options;

    assert.equal(merged.options['use-case'].title, 'Backend use case');
    assert.equal(merged.options['use-case'].required, true);
    assert.equal(options.find((option) => option.id === 'occupational')?.title, 'Backend occupational');
    assert.equal(options.find((option) => option.id === 'frame-only')?.title, 'Backend frame-only');
    assert.equal(options.find((option) => option.id === 'fashion-lenses')?.title, 'Backend fashion-lenses');
    assert.equal(options.find((option) => option.id === 'fashion-lenses')?.price, 10);
  });

  it('normalizes string prices and boolean frame attributes', () => {
    const backend = createBackendData({
      frame: {
        price: '129.00',
        attributes: {
          b2_base_curve: { value: '0' },
          a1_frame_type: { value: 'Wrap' },
        },
      },
    });

    assert.equal(backend.getFramePrice(), 129);
    assert.equal(backend.getFrameTypeCode(), 'wrap');
    assert.equal(backend.getFrameAttributeValue('b2_base_curve'), '0');
  });

  it('applies currency without custom options and does not leak across configs', () => {
    const usd = createLensConfig(createBackendData({ currency_code: 'USD', currency_symbol: '$' }));
    const gbp = createLensConfig(createBackendData({}));

    assert.deepEqual(usd.currency, { code: 'USD', symbol: '$' });
    assert.deepEqual(gbp.currency, { code: 'GBP', symbol: '£' });
  });
});
