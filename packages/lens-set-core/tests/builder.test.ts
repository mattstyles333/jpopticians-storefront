import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculatePriceBreakdown, clearInvalidSelections, evaluateGroupOptions, evaluateStepOptions, getDisplayPriceForOption, getVisibleSteps, hasActiveParentSelection, isBuilderFlowComplete } from '../src/builder';
import { defaultPrescriptionState, getDefaultFrameContext } from '../src/frame-context';
import { lensConfig } from '../src/lens-config';

describe('builder rules', () => {
  it('drops nested tint selections when the parent tint changes', () => {
    const frame = getDefaultFrameContext();

    const sanitized = clearInvalidSelections(
      {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prescription: 'manual',
        tint: 'clear',
        'tint-colour': 'sunglasses-grey',
      },
      lensConfig,
      frame
    );

    assert.equal(sanitized['tint-colour'], undefined);
  });

  it('detects active nested option groups from selected parent options', () => {
    const selections = {
      tint: 'sunglasses',
      'tint-colour': 'sunglasses-grey',
    };

    assert.equal(hasActiveParentSelection(lensConfig, 'tint-colour', selections), true);
    assert.equal(hasActiveParentSelection(lensConfig, 'mirror-colour', selections), false);
  });

  it('shows frame type first for reglaze journeys', () => {
    const frame = {
      ...getDefaultFrameContext(),
      source: 'reglaze' as const,
    };

    const steps = getVisibleSteps(lensConfig, {}, frame);

    assert.equal(steps[0]?.id, 'frame-type');
  });

  it('applies the reglaze frame surcharge to pricing', () => {
    const frame = {
      ...getDefaultFrameContext(),
      source: 'reglaze' as const,
      frameType: 'wrap' as const,
    };
    const selections = {
      'frame-type': 'wrap',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);

    assert.deepEqual(items.find((item) => item.stepId === 'frame-type'), {
      stepId: 'frame-type',
      stepTitle: 'Frame type',
      optionId: 'wrap',
      optionTitle: 'Wrap / sports frame',
      price: 30,
    });
  });

  it('presents one lens type selector in the agreed order', () => {
    const frame = getDefaultFrameContext();
    const steps = getVisibleSteps(lensConfig, {}, frame);
    const lensTypeStep = steps.find((step) => step.id === 'use-case') ?? null;
    const options = evaluateStepOptions(lensConfig, lensTypeStep, {}, frame).filter((option) => !option.isHidden);

    assert.equal(steps.some((step) => step.id === 'lens-family'), false);
    assert.equal(lensTypeStep?.title, 'Lens type');
    assert.deepEqual(
      options.map((option) => [option.id, option.title]),
      [
        ['distance', 'Distance'],
        ['reading', 'Reading'],
        ['varifocal', 'Varifocal'],
        ['occupational', 'Office / occupational'],
        ['intermediate', 'Intermediate'],
        ['bifocal', 'Bifocal'],
        ['frame-only', 'Demo lenses (included)'],
        ['fashion-lenses', 'Fashion lenses'],
      ]
    );
  });

  it('routes every prescription lens type to its matching designs', () => {
    const frame = getDefaultFrameContext();
    const expectedDesigns: Record<string, string[]> = {
      distance: ['sv-distance-standard', 'sv-distance-freeform'],
      reading: ['sv-reading-standard', 'sv-reading-freeform'],
      varifocal: ['varifocal-standard', 'varifocal-premium', 'varifocal-elite', 'zeiss-varifocal', 'essilor-varifocal'],
      occupational: ['occupational-standard', 'occupational-premium', 'zeiss-occupational', 'essilor-occupational'],
      intermediate: ['sv-intermediate-standard', 'sv-intermediate-freeform'],
      bifocal: ['bifocal-d28', 'bifocal-r28', 'bifocal-executive'],
    };

    for (const [lensType, expected] of Object.entries(expectedDesigns)) {
      const selections = { 'use-case': lensType };
      const designStep = getVisibleSteps(lensConfig, selections, frame).find((step) => step.id === 'lens-design') ?? null;
      const designs = evaluateStepOptions(lensConfig, designStep, selections, frame)
        .filter((option) => !option.isHidden)
        .map((option) => option.id);

      assert.deepEqual(designs, expected, lensType);
    }
  });

  it('prices Standard Distance as an additive Magento lens option at £10', () => {
    const frame = getDefaultFrameContext();
    const selections = {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      prescription: 'later',
      tint: 'clear',
      package: 'essential-package',
    };
    const steps = getVisibleSteps(lensConfig, selections, frame);
    const items = calculatePriceBreakdown(lensConfig, steps, selections, frame);
    const designStep = steps.find((step) => step.id === 'lens-design') ?? null;
    const standardDistance = evaluateStepOptions(lensConfig, designStep, selections, frame)
      .find((option) => option.id === 'sv-distance-standard');

    assert.ok(standardDistance);
    assert.equal(getDisplayPriceForOption(lensConfig, 'lens-design', standardDistance, selections, frame), 10);
    assert.deepEqual(items.map((item) => [item.stepId, item.optionId, item.price]), [
      ['lens-design', 'sv-distance-standard', 10],
    ]);
  });

  it('adds the £30 prism surcharge when prism is selected', () => {
    const frame = getDefaultFrameContext();
    const selections = {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      prism: 'prism-required',
      tint: 'clear',
      package: 'essential-package',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);
    assert.deepEqual(items.map((item) => [item.optionId, item.price]), [
      ['sv-distance-standard', 10],
      ['prism-required', 30],
    ]);
  });

  it('defaults standard sunglasses to 85% and charges £10 for custom tint density', () => {
    const tintColours = lensConfig.options['tint-colour'];
    const grey = tintColours.options.find((option) => option.id === 'sunglasses-grey');
    const density = lensConfig.options['tint-density'];

    assert.equal(grey?.childOptionsGroup, 'tint-density');
    assert.equal(density.options.find((option) => option.id === 'tint-density-85')?.price, 0);
    assert.equal(density.options.find((option) => option.id === 'tint-density-80')?.price, 10);
    assert.equal(density.options.find((option) => option.id === 'tint-density-50')?.price, 10);
  });

  it('includes sun UV protection while hiding incompatible UV and blue-light coatings', () => {
    const coatings = evaluateGroupOptions(lensConfig.options['custom-coatings'], {
      'use-case': 'distance',
      tint: 'sunglasses',
      package: 'custom-package',
    }, getDefaultFrameContext()).filter((option) => !option.isHidden).map((option) => option.id);
    const sunglasses = lensConfig.options.tint.options.find((option) => option.id === 'sunglasses');

    assert.equal(coatings.includes('uv-protection'), false);
    assert.equal(coatings.includes('blue-light-coating'), false);
    assert.equal(coatings.includes('anti-reflective'), true);
    assert.equal(sunglasses?.details?.some((detail) => detail.includes('UVA/UVB')), true);
    assert.equal(sunglasses?.details?.some((detail) => detail.includes('£30')), true);
  });

  it('ends the flow at £0 when the included demo lenses are kept', () => {
    const frame = getDefaultFrameContext();
    const selections = { 'use-case': 'frame-only' };
    const steps = getVisibleSteps(lensConfig, selections, frame);

    assert.deepEqual(steps.map((step) => step.id), ['use-case']);
    assert.deepEqual(calculatePriceBreakdown(lensConfig, steps, selections, frame), []);
    assert.equal(isBuilderFlowComplete(lensConfig, selections, structuredClone(defaultPrescriptionState), frame), true);
  });

  it('uses Magento-representable options for configurable £10 fashion lenses', () => {
    const frame = getDefaultFrameContext();
    const baseSelections = {
      'use-case': 'fashion-lenses',
      package: 'essential-package',
    };
    const clearSelections = { ...baseSelections, tint: 'clear' };
    const tintedSelections = { ...baseSelections, tint: 'fashion-sunglasses', 'tint-colour': 'sunglasses-grey' };
    const blueLightSelections = { ...baseSelections, tint: 'blue-light' };
    const steps = getVisibleSteps(lensConfig, clearSelections, frame);
    const tintStep = steps.find((step) => step.id === 'tint') ?? null;
    const tintOptions = evaluateStepOptions(lensConfig, tintStep, clearSelections, frame)
      .filter((option) => !option.isHidden)
      .map((option) => option.id);

    assert.deepEqual(steps.map((step) => step.id), ['use-case', 'tint', 'package']);
    assert.deepEqual(tintOptions, ['clear', 'fashion-sunglasses', 'blue-light']);

    for (const selections of [clearSelections, tintedSelections]) {
      const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);
      assert.deepEqual(items.map((item) => [item.stepId, item.optionId, item.price]), [
        ['use-case', 'fashion-lenses', 10],
      ]);
    }

    const blueLightItems = calculatePriceBreakdown(
      lensConfig,
      getVisibleSteps(lensConfig, blueLightSelections, frame),
      blueLightSelections,
      frame
    );
    assert.deepEqual(blueLightItems.map((item) => [item.stepId, item.optionId, item.price]), [
      ['use-case', 'fashion-lenses', 10],
      ['tint', 'blue-light', 25],
    ]);

    const fashionCoatings = evaluateGroupOptions(lensConfig.options['custom-coatings'], {
      ...clearSelections,
      package: 'custom-package',
      'custom-index': 'index-15',
    }, frame).filter((option) => !option.isHidden).map((option) => option.id);
    const standardCoatings = evaluateGroupOptions(lensConfig.options['custom-coatings'], {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      tint: 'clear',
      package: 'custom-package',
      'custom-index': 'index-15',
    }, frame).filter((option) => !option.isHidden).map((option) => option.id);
    const selectedBlueLightCoatings = evaluateGroupOptions(lensConfig.options['custom-coatings'], {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      tint: 'blue-light',
      package: 'custom-package',
      'custom-index': 'index-15',
    }, frame).filter((option) => !option.isHidden).map((option) => option.id);

    assert.equal(fashionCoatings.includes('blue-light-coating'), false);
    assert.equal(standardCoatings.includes('blue-light-coating'), true);
    assert.equal(selectedBlueLightCoatings.includes('blue-light-coating'), false);
  });

  it('drops rimless-blocked options after reglaze frame selection changes the frame context', () => {
    const frame = {
      ...getDefaultFrameContext(),
      source: 'reglaze' as const,
      frameType: 'rimless' as const,
    };

    const sanitized = clearInvalidSelections(
      {
        'frame-type': 'rimless',
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        prescription: 'manual',
        tint: 'mirror',
      },
      lensConfig,
      frame
    );

    assert.equal(sanitized.tint, undefined);
  });

  it('drops hidden nested colour selections after related choices change', () => {
    const frame = getDefaultFrameContext();

    const sanitized = clearInvalidSelections(
      {
        'use-case': 'varifocal',
        'lens-design': 'varifocal-standard',
        prescription: 'manual',
        tint: 'sunglasses',
        'tint-colour': 'yellow-tint',
      },
      lensConfig,
      frame
    );

    assert.equal(sanitized.tint, 'sunglasses');
    assert.equal(sanitized['tint-colour'], undefined);
  });

  it('includes priced nested colour selections in the price breakdown', () => {
    const frame = getDefaultFrameContext();
    const selections = {
      'use-case': 'varifocal',
      'lens-design': 'varifocal-standard',
      prescription: 'manual',
      tint: 'sunglasses',
      'tint-colour': 'polarised-grey',
      package: 'essential-package',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);

    assert.deepEqual(items.find((item) => item.stepId === 'tint-colour'), {
      stepId: 'tint-colour',
      stepTitle: 'Tint colour',
      optionId: 'polarised-grey',
      optionTitle: 'Polarised Grey',
      price: 30,
    });
  });

  it('shows supplier glazing first for Maui Jim supplier-eligible frames', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };

    const steps = getVisibleSteps(lensConfig, {}, frame);

    assert.equal(steps[0]?.id, 'glazing-route');
    assert.equal(steps.some((step) => step.id === 'use-case'), true);
  });

  it('switches to the Maui Jim supplier lens path after official glazing is selected', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };

    const steps = getVisibleSteps(lensConfig, { 'glazing-route': 'maui-jim-sun' }, frame).map((step) => step.id);

    assert.deepEqual(steps, ['glazing-route', 'maui-jim-vision-type']);
  });

  it('goes straight from Maui Jim use to lens material', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };

    const steps = getVisibleSteps(
      lensConfig,
      {
        'glazing-route': 'maui-jim-sun',
        'maui-jim-vision-type': 'maui-jim-reading',
      },
      frame
    ).map((step) => step.id);

    assert.deepEqual(steps, ['glazing-route', 'maui-jim-vision-type', 'maui-jim-lens-material', 'prism', 'prescription']);
  });

  it('prices Maui Jim supplier lenses from wholesale plus margin', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };
    const selections = {
      'glazing-route': 'maui-jim-sun',
      'maui-jim-vision-type': 'maui-jim-varifocal',
      'maui-jim-lens-material': 'maui-evolution-varifocal',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);

    assert.deepEqual(items.find((item) => item.stepId === 'maui-jim-lens-material'), {
      stepId: 'maui-jim-lens-material',
      stepTitle: 'Maui Jim lens material',
      optionId: 'maui-evolution-varifocal',
      optionTitle: 'Maui Evolution',
      price: 316,
    });
  });

  it('shows Maui Jim colours supported by the selected lens material', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };
    const expectedBiGradient = [
      'maui-bi-gradient-neutral-grey',
      'maui-bi-gradient-hcl-bronze',
      'maui-bi-gradient-maui-rose',
      'maui-bi-gradient-maui-ht',
    ];
    const expectedMauiGradient = [
      'maui-gradient-neutral-grey',
      'maui-gradient-hcl-bronze',
      'maui-gradient-maui-rose',
      'maui-gradient-maui-ht',
    ];
    const expectedBrilliantExclusive = [
      'maui-brilliant-blue-hawaii',
      'maui-brilliant-maui-sunrise',
      'maui-brilliant-hawaii-lava',
      'maui-brilliant-maui-green',
    ];

    const visibleColours = (material: string) => {
      const selections = {
        'glazing-route': 'maui-jim-sun',
        'maui-jim-vision-type': 'maui-jim-varifocal',
        'maui-jim-lens-material': material,
      };
      const colourStep = getVisibleSteps(lensConfig, selections, frame).find((step) => step.id === 'maui-jim-lens-colour') ?? null;
      return evaluateStepOptions(lensConfig, colourStep, selections, frame).filter((option) => !option.isHidden);
    };

    assert.deepEqual(visibleColours('maui-polycarbonate-varifocal').map((option) => option.id), expectedBiGradient);
    assert.deepEqual(
      visibleColours('maui-evolution-varifocal').map((option) => option.id),
      [...expectedBiGradient, ...expectedMauiGradient]
    );

    const brilliantColours = visibleColours('maui-brilliant-varifocal');
    assert.deepEqual(
      brilliantColours.map((option) => option.id),
      [...expectedBiGradient, ...expectedMauiGradient, ...expectedBrilliantExclusive]
    );
    assert.equal(brilliantColours.every((option) => option.color?.startsWith('linear-gradient(')), true);
  });

  it('clears a MauiBrilliant-exclusive colour when the material changes', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };
    const sanitized = clearInvalidSelections(
      {
        'glazing-route': 'maui-jim-sun',
        'maui-jim-vision-type': 'maui-jim-varifocal',
        'maui-jim-lens-material': 'maui-evolution-varifocal',
        'maui-jim-lens-colour': 'maui-brilliant-blue-hawaii',
      },
      lensConfig,
      frame
    );

    assert.equal(sanitized['maui-jim-lens-colour'], undefined);
  });

  it('hides standard lens steps when a supplier glazing route is selected', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };

    const steps = getVisibleSteps(lensConfig, { 'glazing-route': 'maui-jim-sun' }, frame).map((step) => step.id);

    assert.equal(steps.includes('use-case'), false);
    assert.equal(steps.includes('lens-design'), false);
    assert.equal(steps.includes('tint'), false);
    assert.equal(steps.includes('package'), false);
  });

  it('shows the fixed Ray-Ban sun lens menu after a branded sunglass route is selected', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['rayban-sun' as const],
    };
    const selections = {
      'glazing-route': 'rayban-sun',
      'luxottica-vision-type': 'luxottica-distance',
    };

    const steps = getVisibleSteps(lensConfig, selections, frame);
    const stepIds = steps.map((step) => step.id);
    const lensOptionStep = steps.find((step) => step.id === 'luxottica-lens-option') ?? null;
    const options = evaluateStepOptions(lensConfig, lensOptionStep, selections, frame).filter((option) => !option.isHidden);

    assert.deepEqual(stepIds, ['glazing-route', 'luxottica-vision-type', 'luxottica-lens-option']);
    assert.deepEqual(
      options.map((option) => [option.id, option.price]),
      [['rayban-sun-single-vision-tint', 159]]
    );
  });

  it('shows clear and Transitions only for Oakley optical varifocals', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['oakley-optical' as const],
    };
    const selections = {
      'glazing-route': 'oakley-optical',
      'luxottica-vision-type': 'luxottica-varifocal',
    };

    const steps = getVisibleSteps(lensConfig, selections, frame);
    const lensOptionStep = steps.find((step) => step.id === 'luxottica-lens-option') ?? null;
    const options = evaluateStepOptions(lensConfig, lensOptionStep, selections, frame).filter((option) => !option.isHidden);

    assert.deepEqual(
      options.map((option) => [option.id, option.price]),
      [
        ['oakley-optical-varifocal-clear', 249],
        ['oakley-optical-varifocal-transitions-gen-s', 349],
      ]
    );
  });

  it('asks for an included colour after a branded sunglass lens option is selected', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['rayban-sun' as const],
    };
    const selections = {
      'glazing-route': 'rayban-sun',
      'luxottica-vision-type': 'luxottica-distance',
      'luxottica-lens-option': 'rayban-sun-single-vision-tint',
    };

    const steps = getVisibleSteps(lensConfig, selections, frame);
    const colourStep = steps.find((step) => step.id === 'luxottica-lens-colour') ?? null;
    const options = evaluateStepOptions(lensConfig, colourStep, selections, frame).filter((option) => !option.isHidden);

    assert.deepEqual(
      steps.map((step) => step.id),
      ['glazing-route', 'luxottica-vision-type', 'luxottica-lens-option', 'luxottica-lens-colour', 'prism', 'prescription']
    );
    assert.deepEqual(
      options.map((option) => [option.id, option.price, option.color]),
      [
        ['rayban-sun-colour-g15-green', 0, '#3F5132'],
        ['rayban-sun-colour-b15-brown', 0, '#6B4423'],
        ['rayban-sun-colour-grey', 0, '#4A4A4A'],
        ['rayban-sun-colour-brown', 0, '#8B4513'],
        ['rayban-sun-colour-polarised-grey', 50, '#3D3D3D'],
        ['rayban-sun-colour-polarised-brown', 50, '#5C3A1E'],
        ['rayban-sun-colour-polarised-g15', 50, '#2E3D24'],
        ['rayban-sun-colour-polarised-b15', 50, '#4D3016'],
      ]
    );
  });

  it('shows the supplied solid and gradient finishes for Oakley sun lenses', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['oakley-sun' as const],
    };
    const selections = {
      'glazing-route': 'oakley-sun',
      'luxottica-vision-type': 'luxottica-varifocal',
      'luxottica-lens-option': 'oakley-sun-varifocal-tint',
    };

    const colourStep = getVisibleSteps(lensConfig, selections, frame).find((step) => step.id === 'luxottica-lens-colour') ?? null;
    const options = evaluateStepOptions(lensConfig, colourStep, selections, frame).filter((option) => !option.isHidden);

    assert.deepEqual(
      options.map((option) => [option.title, option.color]),
      [
        ['Grey', '#4A4A4A'],
        ['Bronze', '#8A5C2E'],
        ['Black Iridium', 'linear-gradient(135deg, #111827, #4B5563, #D1D5DB)'],
        ['Sapphire Iridium', 'linear-gradient(135deg, #0B3D91, #0EA5E9, #BAE6FD)'],
        ['Jade PRIZM', 'linear-gradient(135deg, #064E3B, #10B981, #A7F3D0)'],
        ['Tungsten PRIZM', 'linear-gradient(135deg, #7C3F12, #B7791F, #FBBF24)'],
        ['VR50 PRIZM', 'linear-gradient(135deg, #3B2F15, #9A7B3C, #D4C080)'],
        ['Fire Iridium', 'linear-gradient(135deg, #6B2100, #D96C1A, #FFB088)'],
      ]
    );
  });

  it('prices Ray-Ban polarization as a tint colour', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['rayban-sun' as const],
    };
    const selections = {
      'glazing-route': 'rayban-sun',
      'luxottica-vision-type': 'luxottica-varifocal',
      'luxottica-lens-option': 'rayban-sun-varifocal-tint',
      'luxottica-lens-colour': 'rayban-sun-colour-polarised-g15',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);

    assert.deepEqual(
      items.map((item) => [item.optionId, item.price]),
      [
        ['rayban-sun-varifocal-tint', 259],
        ['rayban-sun-colour-polarised-g15', 50],
      ]
    );
  });

  it('does not ask for a colour on branded optical lenses', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['rayban-optical' as const],
    };
    const selections = {
      'glazing-route': 'rayban-optical',
      'luxottica-vision-type': 'luxottica-distance',
      'luxottica-lens-option': 'rayban-optical-single-vision-clear',
    };

    const steps = getVisibleSteps(lensConfig, selections, frame).map((step) => step.id);

    assert.equal(steps.includes('luxottica-lens-colour'), false);
  });

  it('prices Luxottica Authentics selections from the verified fixed matrix', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['rayban-optical' as const],
    };
    const selections = {
      'glazing-route': 'rayban-optical',
      'luxottica-vision-type': 'luxottica-varifocal',
      'luxottica-lens-option': 'rayban-optical-varifocal-transitions-gen-s',
    };

    const items = calculatePriceBreakdown(lensConfig, getVisibleSteps(lensConfig, selections, frame), selections, frame);

    assert.deepEqual(items.find((item) => item.stepId === 'luxottica-lens-option'), {
      stepId: 'luxottica-lens-option',
      stepTitle: 'Branded lens option',
      optionId: 'rayban-optical-varifocal-transitions-gen-s',
      optionTitle: 'Transitions Gen S varifocal',
      price: 389,
    });
  });

  it('clears supplier selections when switching back to Spex4Less glazing', () => {
    const frame = {
      ...getDefaultFrameContext(),
      supplierGlazingRoutes: ['maui-jim-sun' as const],
    };

    const sanitized = clearInvalidSelections(
      {
        'glazing-route': 'spex4less',
        'maui-jim-vision-type': 'maui-jim-varifocal',
        'maui-jim-lens-material': 'maui-brilliant-varifocal',
      },
      lensConfig,
      frame
    );

    assert.equal(sanitized['glazing-route'], 'spex4less');
    assert.equal(sanitized['maui-jim-vision-type'], undefined);
    assert.equal(sanitized['maui-jim-lens-material'], undefined);
  });

  it('requires active nested tint colours before the flow is complete', () => {
    const frame = getDefaultFrameContext();
    const prescription = { ...structuredClone(defaultPrescriptionState), method: 'later' as const };
    const selections = {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      prism: 'no-prism',
      tint: 'sunglasses',
      package: 'essential-package',
    };

    assert.equal(isBuilderFlowComplete(lensConfig, selections, prescription, frame), false);
    assert.equal(isBuilderFlowComplete(lensConfig, {
      ...selections,
      'tint-colour': 'sunglasses-grey',
      'tint-density': 'tint-density-85',
    }, prescription, frame), true);
  });

  it('allows varifocals from eye size 27 through 60 inclusive', () => {
    const selections = {};
    const optionVisible = (eyeSize: number) => {
      const frame = { ...getDefaultFrameContext(), eyeSize };
      const step = lensConfig.steps.find((candidate) => candidate.id === 'use-case') ?? null;
      return evaluateStepOptions(lensConfig, step, selections, frame).find((option) => option.id === 'varifocal')?.isHidden === false;
    };

    assert.equal(optionVisible(26), false);
    assert.equal(optionVisible(27), true);
    assert.equal(optionVisible(60), true);
    assert.equal(optionVisible(61), false);
  });

  it('blocks 1.74 index for every photochromic tint variant', () => {
    const frame = getDefaultFrameContext();
    const group = lensConfig.options['custom-index'];

    for (const tint of ['photochromic', 'transitions-gen-s', 'xtractive']) {
      const option = evaluateGroupOptions(group, { tint }, frame).find((candidate) => candidate.id === 'index-174');
      assert.equal(option?.isHidden, true, `${tint} should block 1.74`);
    }
  });

  it('filters incompatible later indices instead of clearing an earlier bifocal tint', () => {
    const frame = getDefaultFrameContext();
    const indexGroup = lensConfig.options['custom-index'];
    const visibleIndices = (selections: Record<string, string>) => evaluateGroupOptions(indexGroup, selections, frame)
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);

    assert.deepEqual(visibleIndices({
      'use-case': 'bifocal',
      'lens-design': 'bifocal-d28',
      tint: 'photochromic',
      'tint-colour': 'photochromic-grey',
    }), ['index-15']);
    assert.deepEqual(visibleIndices({
      'use-case': 'bifocal',
      'lens-design': 'bifocal-d28',
      tint: 'sunglasses',
      'tint-colour': 'polarised-grey',
    }), ['index-15']);
    assert.equal(visibleIndices({ tint: 'blue-light' }).includes('index-174'), false);
  });

  it('keeps valid bifocal tints available when editing before an incompatible index', () => {
    const selections = {
      'use-case': 'bifocal',
      'lens-design': 'bifocal-d28',
      package: 'custom-package',
      'custom-index': 'index-16',
    };
    const tintOptions = evaluateGroupOptions(lensConfig.options.tint, selections, getDefaultFrameContext())
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);
    const colourOptions = evaluateGroupOptions(lensConfig.options['tint-colour'], {
      ...selections,
      tint: 'sunglasses',
    }, getDefaultFrameContext())
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);

    assert.equal(tintOptions.includes('photochromic'), true);
    assert.equal(tintOptions.includes('transitions-gen-s'), true);
    assert.equal(tintOptions.includes('xtractive'), true);
    assert.equal(colourOptions.includes('polarised-grey'), true);
    assert.equal(colourOptions.includes('polarised-brown'), true);
  });

  it('keeps blue light available when editing before a selected 1.74 index', () => {
    const selections = {
      'use-case': 'distance',
      'lens-design': 'sv-distance-standard',
      package: 'custom-package',
      'custom-index': 'index-174',
    };
    const tintOptions = evaluateGroupOptions(lensConfig.options.tint, selections, getDefaultFrameContext())
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);
    const sanitized = clearInvalidSelections({ ...selections, tint: 'blue-light' }, lensConfig, getDefaultFrameContext());

    assert.equal(tintOptions.includes('blue-light'), true);
    assert.equal(sanitized.tint, 'blue-light');
    assert.equal(sanitized['custom-index'], undefined);
  });

  it('avoids an empty index step for rimless bifocals', () => {
    const frame = { ...getDefaultFrameContext(), frameType: 'rimless' as const };
    const selections = {
      'use-case': 'bifocal',
      'lens-design': 'bifocal-d28',
      tint: 'clear',
      package: 'custom-package',
    };
    const tintOptions = evaluateGroupOptions(lensConfig.options.tint, selections, frame)
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);
    const polarisedColours = evaluateGroupOptions(lensConfig.options['tint-colour'], { ...selections, tint: 'sunglasses' }, frame)
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);
    const indexOptions = evaluateGroupOptions(lensConfig.options['custom-index'], selections, frame)
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);

    assert.equal(tintOptions.includes('photochromic'), false);
    assert.equal(tintOptions.includes('transitions-gen-s'), false);
    assert.equal(tintOptions.includes('xtractive'), false);
    assert.equal(polarisedColours.includes('polarised-grey'), false);
    assert.deepEqual(indexOptions, ['index-16', 'index-167']);
  });

  it('sanitizes uncoated into an exclusive coating selection', () => {
    const sanitized = clearInvalidSelections(
      {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        tint: 'clear',
        package: 'custom-package',
        'custom-index': 'index-16',
        'custom-coatings': ['uncoated', 'hydrophobic'],
      },
      lensConfig,
      getDefaultFrameContext()
    );

    assert.deepEqual(sanitized['custom-coatings'], ['uncoated']);
  });
});
