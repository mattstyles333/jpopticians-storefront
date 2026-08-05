import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDefaultFrameContext, defaultPrescriptionState } from '../src/frame-context';
import { lensConfig } from '../src/lens-config';
import { buildReviewSections } from '../src/review';

describe('review model', () => {
  it('includes checkbox, nested, and full prescription details with valid edit targets', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.manual.rightSphereValue = '0.00';
    prescription.manual.leftSphereSign = '+';
    prescription.manual.leftSphereValue = '1.00';
    prescription.manual.pd = '64.0';
    const sections = buildReviewSections(
      lensConfig,
      {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        tint: 'sunglasses',
        'tint-colour': 'sunglasses-grey',
        package: 'custom-package',
        'custom-index': 'index-16',
        'custom-coatings': ['anti-reflective', 'hydrophobic'],
      },
      getDefaultFrameContext(),
      prescription,
      null
    );

    const coatings = sections.find((section) => section.title === 'Coatings');
    assert.deepEqual(coatings?.values, ['Anti-Reflective', 'Hydrophobic']);
    const tintColour = sections.find((section) => section.title === 'Tint colour');
    assert.equal(tintColour?.editStepId, 'tint');
    const prescriptionSection = sections.find((section) => section.title === 'Prescription');
    assert.equal(prescriptionSection?.details.some((detail) => detail.includes('Right eye: SPH 0.00')), true);
    assert.equal(prescriptionSection?.details.includes('PD: 64.0 mm'), true);
  });

  it('marks a missing required child selection as incomplete', () => {
    const prescription = { ...structuredClone(defaultPrescriptionState), method: 'later' as const };
    const sections = buildReviewSections(
      lensConfig,
      {
        'use-case': 'distance',
        'lens-design': 'sv-distance-standard',
        tint: 'sunglasses',
        package: 'essential-package',
      },
      getDefaultFrameContext(),
      prescription,
      null
    );

    assert.equal(sections.find((section) => section.title === 'Tint')?.complete, false);
    assert.deepEqual(sections.find((section) => section.title === 'Tint colour')?.values, ['Not selected']);
  });
});
