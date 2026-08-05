import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildLensCustomizationDraft, buildMagentoCustomizations, createMagentoQuotePersistence } from '../src/persistence';
import { defaultPrescriptionState, getDefaultFrameContext } from '../src/frame-context';
import { createBackendData } from '../src/backend-data';
import { lensConfig } from '../src/lens-config';
import { fromMagentoLensQuoteResponse, toMagentoLensQuotePayload } from '../src/adapters/magento';

describe('persistence payloads', () => {
  it('rejects malformed successful Magento responses', () => {
    assert.throws(() => fromMagentoLensQuoteResponse({ status: 'submitted' }), /invalid lens quote ID/);
    assert.throws(() => fromMagentoLensQuoteResponse({ quoteId: 'quote-1', status: 'unexpected' }), /invalid lens quote status/);
  });

  it('includes nested colour selections in Magento customizations', () => {
    const selections = {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      prism: 'prism-required',
      tint: 'sunglasses',
      'tint-colour': 'sunglasses-grey',
      'tint-density': 'tint-density-85',
      package: 'essential-package',
    };

    const customizations = buildMagentoCustomizations(selections);

    assert.deepEqual(customizations.find((entry) => entry.code === 'tint_type'), { code: 'tint_type', value: 'sunglasses' });
    assert.deepEqual(customizations.find((entry) => entry.code === 'tint_colour'), { code: 'tint_colour', value: 'sunglasses-grey' });
    assert.deepEqual(customizations.find((entry) => entry.code === 'tint_density'), { code: 'tint_density', value: 'tint-density-85' });
    assert.deepEqual(customizations.find((entry) => entry.code === 'prism'), { code: 'prism', value: 'prism-required' });
  });

  it('defaults generic orders to Spex4Less glazing in Magento customizations', () => {
    const customizations = buildMagentoCustomizations(
      {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
      }
    );

    assert.deepEqual(customizations.find((entry) => entry.code === 'glazing_route'), { code: 'glazing_route', value: 'spex4less' });
  });

  it('derives the Magento lens family from every consolidated lens type', () => {
    const expectedFamilies: Record<string, string> = {
      distance: 'single-vision',
      reading: 'single-vision',
      varifocal: 'progressive',
      occupational: 'progressive',
      intermediate: 'single-vision',
      bifocal: 'progressive',
      'frame-only': 'non-prescription',
      'fashion-lenses': 'non-prescription',
    };

    for (const [useCase, family] of Object.entries(expectedFamilies)) {
      const customizations = buildMagentoCustomizations({ 'use-case': useCase });

      assert.deepEqual(customizations.find((entry) => entry.code === 'lens_family'), { code: 'lens_family', value: family });
      assert.deepEqual(customizations.find((entry) => entry.code === 'use_case'), { code: 'use_case', value: useCase });
    }
  });

  it('omits prescription data for non-prescription orders', () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'fashion-lenses',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription: {
        method: 'manual',
        uploadReference: '',
        savedReference: '',
        manual: {
          rightSphereSign: '+',
          rightSphereValue: '1.00',
          rightCylinderSign: '',
          rightCylinderValue: '0.00',
          rightAxis: '',
          leftSphereSign: '+',
          leftSphereValue: '1.00',
          leftCylinderSign: '',
          leftCylinderValue: '0.00',
          leftAxis: '',
          rightAddPower: '',
          leftAddPower: '',
          rightIntermediateAdd: '',
          leftIntermediateAdd: '',
          rightPrism: '',
          leftPrism: '',
          pd: '64',
        },
      },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });

    assert.equal(draft.prescription, null);
    assert.equal(draft.magentoCustomizations.some((entry) => entry.code === 'prescription_method'), false);
  });

  it('omits prescription data when included demo lenses are kept', () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: { 'use-case': 'frame-only' },
      prescription: { ...structuredClone(defaultPrescriptionState), method: 'later' },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });

    assert.equal(draft.prescription, null);
    assert.equal(draft.magentoCustomizations.some((entry) => entry.code === 'prescription_method'), false);
  });

  it('includes the reglaze frame type selection in Magento customizations', () => {
    const customizations = buildMagentoCustomizations(
      {
        'frame-type': 'rimless',
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'clear',
        package: 'essential-package',
      }
    );

    assert.deepEqual(customizations.find((entry) => entry.code === 'frame_type'), { code: 'frame_type', value: 'rimless' });
  });

  it('includes the optional reglaze frame description in Magento customizations', () => {
    const customizations = buildMagentoCustomizations(
      {
        'frame-type': 'full-rim',
      },
      'Ray-Ban RB5228 black acetate with small scratch on temple'
    );

    assert.deepEqual(customizations.find((entry) => entry.code === 'frame_description'), {
      code: 'frame_description',
      value: 'Ray-Ban RB5228 black acetate with small scratch on temple',
    });
  });

  it('keeps prescription data in the dedicated payload and out of product customizations', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.method = 'saved';
    prescription.savedReference = '  RX-123  ';
    prescription.manual.rightAddPower = '1.50';
    prescription.manual.leftAddPower = '1.50';

    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: { 'use-case': 'distance' },
      prescription,
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });

    assert.equal(draft.prescription?.manual.rightAddPower, '');
    assert.equal(draft.magentoCustomizations.some((entry) => entry.code.startsWith('prescription')), false);
    assert.deepEqual(toMagentoLensQuotePayload(draft).prescription, { mode: 'saved', reference: 'RX-123' });
  });

  it('keeps supplier glazing prescription data out of product customizations', () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: {
        'glazing-route': 'maui-jim-sun',
        'maui-jim-vision-type': 'maui-jim-varifocal',
        'maui-jim-lens-material': 'maui-brilliant-varifocal',
      },
      prescription: {
        method: 'manual',
        uploadReference: '',
        savedReference: '',
        manual: {
          rightSphereSign: '+',
          rightSphereValue: '1.00',
          rightCylinderSign: '',
          rightCylinderValue: '0.00',
          rightAxis: '',
          leftSphereSign: '+',
          leftSphereValue: '1.00',
          leftCylinderSign: '',
          leftCylinderValue: '0.00',
          leftAxis: '',
          rightAddPower: '1.50',
          leftAddPower: '1.50',
          rightIntermediateAdd: '',
          leftIntermediateAdd: '',
          rightPrism: '',
          leftPrism: '',
          pd: '64',
        },
      },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });

    assert.notEqual(draft.prescription, null);
    assert.equal(draft.magentoCustomizations.some((entry) => entry.code.startsWith('prescription')), false);
    assert.equal(toMagentoLensQuotePayload(draft).prescription?.mode, 'manual');
  });

  it('includes Maui Jim supplier glazing selections in Magento customizations', () => {
    const customizations = buildMagentoCustomizations(
      {
        'glazing-route': 'maui-jim-sun',
        'maui-jim-vision-type': 'maui-jim-distance',
        'maui-jim-lens-material': 'maui-polycarbonate-single-vision',
        'maui-jim-lens-colour': 'maui-bi-gradient-hcl-bronze',
      }
    );

    assert.deepEqual(customizations.find((entry) => entry.code === 'glazing_route'), { code: 'glazing_route', value: 'maui-jim-sun' });
    assert.deepEqual(customizations.find((entry) => entry.code === 'maui_jim_vision_type'), {
      code: 'maui_jim_vision_type',
      value: 'maui-jim-distance',
    });
    assert.deepEqual(customizations.find((entry) => entry.code === 'maui_jim_lens_material'), {
      code: 'maui_jim_lens_material',
      value: 'maui-polycarbonate-single-vision',
    });
    assert.deepEqual(customizations.find((entry) => entry.code === 'maui_jim_lens_colour'), {
      code: 'maui_jim_lens_colour',
      value: 'maui-bi-gradient-hcl-bronze',
    });
  });

  it('includes supplier route and lens ID as top-level payload metadata for Luxottica Authentics selections', () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: {
        'glazing-route': 'oakley-sun',
        'luxottica-vision-type': 'luxottica-varifocal',
        'luxottica-lens-option': 'oakley-sun-varifocal-polarised',
        'luxottica-lens-colour': 'oakley-sun-colour-jade-prizm',
      },
      prescription: structuredClone(defaultPrescriptionState),
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });

    const customizations = draft.magentoCustomizations;

    assert.deepEqual(customizations.find((entry) => entry.code === 'glazing_route'), { code: 'glazing_route', value: 'oakley-sun' });
    assert.deepEqual(customizations.find((entry) => entry.code === 'luxottica_vision_type'), {
      code: 'luxottica_vision_type',
      value: 'luxottica-varifocal',
    });
    assert.deepEqual(customizations.find((entry) => entry.code === 'luxottica_lens_option'), {
      code: 'luxottica_lens_option',
      value: 'oakley-sun-varifocal-polarised',
    });
    assert.deepEqual(customizations.find((entry) => entry.code === 'luxottica_lens_colour'), {
      code: 'luxottica_lens_colour',
      value: 'oakley-sun-colour-jade-prizm',
    });
    assert.equal(customizations.some((entry) => entry.code === 'supplier_route'), false);
    assert.equal(customizations.some((entry) => entry.code === 'supplier_lens_id'), false);
    assert.deepEqual(draft.supplier, { route: 'oakley-sun', lensId: 'oakley-sun-varifocal-polarised' });
  });

  it('submits the polarised Ray-Ban supplier lens ID selected through tint colour', () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: {
        'glazing-route': 'rayban-sun',
        'luxottica-vision-type': 'luxottica-varifocal',
        'luxottica-lens-option': 'rayban-sun-varifocal-tint',
        'luxottica-lens-colour': 'rayban-sun-colour-polarised-grey',
      },
      prescription: structuredClone(defaultPrescriptionState),
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 309,
    });

    assert.deepEqual(draft.supplier, { route: 'rayban-sun', lensId: 'rayban-sun-varifocal-polarised' });
  });

  it('submits prescription and optional reglaze frame files with structured metadata', async () => {
    const file = new File(['prescription'], 'rx.pdf', { type: 'application/pdf' });
    const frameFile = new File(['frame'], 'frame.jpg', { type: 'image/jpeg' });
    const prescription = { ...structuredClone(defaultPrescriptionState), method: 'upload' as const, uploadReference: file.name };
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription,
      prescriptionAttachment: { name: file.name, mimeType: file.type, size: file.size },
      reglazeFrameDescription: '',
      reglazeFrameAttachment: { name: frameFile.name, mimeType: frameFile.type, size: frameFile.size },
      priceItems: [],
      totalPrice: 0,
    });
    let requestBody: BodyInit | null | undefined;
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      config: lensConfig,
      backendData: createBackendData({ form_key: 'form-key' }),
      fetchImpl: async (_input, init) => {
        requestBody = init?.body;
        return new Response(JSON.stringify({ quoteId: 'quote-1', status: 'submitted', customizationsSaved: 6 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await persistence.submitDraft(draft, file, frameFile);

    assert.equal(requestBody instanceof FormData, true);
    const formData = requestBody as FormData;
    assert.equal((formData.get('prescription_file') as File).name, 'rx.pdf');
    assert.equal((formData.get('frame_image') as File).name, 'frame.jpg');
    const configuration = JSON.parse(String(formData.get('configuration')));
    assert.equal(configuration.configVersion, lensConfig.version);
    assert.equal(configuration.termsAccepted, true);
    assert.equal(configuration.pricing.currencyCode, 'GBP');
    assert.deepEqual(configuration.prescription, {
      mode: 'upload',
      file: { field: 'prescription_file', name: 'rx.pdf', mimeType: 'application/pdf', size: file.size },
    });
    assert.deepEqual(configuration.frameImage, {
      field: 'frame_image',
      name: 'frame.jpg',
      mimeType: 'image/jpeg',
      size: frameFile.size,
    });
  });

  it('rejects submission until the terms are accepted', async () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'fashion-lenses',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription: structuredClone(defaultPrescriptionState),
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 10,
    });
    let called = false;
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    await assert.rejects(() => persistence.submitDraft(draft), /Accept the Spex4Less terms/i);
    assert.equal(called, false);
  });

  it('rejects incomplete nested selections before performing a request', async () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'sunglasses',
        package: 'essential-package',
      },
      prescription: { ...structuredClone(defaultPrescriptionState), method: 'later' },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });
    let called = false;
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      fetchImpl: async () => {
        called = true;
        return new Response();
      },
    });

    await assert.rejects(() => persistence.submitDraft(draft), /incomplete or invalid/);
    assert.equal(called, false);
  });

  it('rejects a draft response when Magento was asked to submit', async () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription: { ...structuredClone(defaultPrescriptionState), method: 'later' },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      fetchImpl: async () => new Response(JSON.stringify({ quoteId: 'quote-1', status: 'draft' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    });

    await assert.rejects(() => persistence.submitDraft(draft), /did not confirm/);
  });

  it('times out a stalled Magento submission', async () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription: { ...structuredClone(defaultPrescriptionState), method: 'later' },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });
    const request: { signal?: AbortSignal } = {};
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      requestTimeoutMs: 5,
      fetchImpl: async (_input, init) => {
        request.signal = init?.signal as AbortSignal;
        return await new Promise<Response>((_resolve, reject) => {
          request.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      },
    });

    await assert.rejects(() => persistence.submitDraft(draft), /timed out/);
    assert.equal(request.signal?.aborted, true);
  });

  it('times out when Magento stalls while sending a successful response body', async () => {
    const draft = buildLensCustomizationDraft({
      quoteId: null,
      termsAccepted: true,
      frame: getDefaultFrameContext(),
      selections: {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prism: 'no-prism',
        tint: 'clear',
        package: 'essential-package',
      },
      prescription: { ...structuredClone(defaultPrescriptionState), method: 'later' },
      reglazeFrameDescription: '',
      priceItems: [],
      totalPrice: 0,
    });
    const persistence = createMagentoQuotePersistence({
      submitUrl: '/submit',
      requestTimeoutMs: 5,
      fetchImpl: async () => new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{'));
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    });

    await assert.rejects(() => persistence.submitDraft(draft), /timed out/);
  });
});
