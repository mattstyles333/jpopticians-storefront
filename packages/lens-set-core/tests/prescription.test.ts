import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getAvailablePrescriptionMethods } from '../src/builder';
import { getPrescriptionNeeds, readingAddOptions, sanitizePrescriptionForSelections, sphereOptions, validatePrescriptionState } from '../src/prescription';
import { defaultPrescriptionState, getDefaultFrameContext } from '../src/frame-context';
import { lensConfig } from '../src/lens-config';
import type { PrescriptionState } from '../src/types';

function selectZeroPowers(prescription: PrescriptionState): PrescriptionState {
  prescription.manual.rightSphereValue = '0.00';
  prescription.manual.rightCylinderValue = '0.00';
  prescription.manual.leftSphereValue = '0.00';
  prescription.manual.leftCylinderValue = '0.00';
  return prescription;
}

describe('prescription validation', () => {
  it('requires reading add values for varifocal jobs', () => {
    const result = validatePrescriptionState(
      {
        ...structuredClone(defaultPrescriptionState),
        manual: {
          ...structuredClone(defaultPrescriptionState.manual),
          rightSphereSign: '+',
          leftSphereSign: '+',
        },
      },
      {
        'use-case': 'varifocal',
      }
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.rightAddPower);
    assert.ok(result.errors.leftAddPower);
  });

  it('accepts upload mode only when a valid file is present', () => {
    const result = validatePrescriptionState(
      {
        ...structuredClone(defaultPrescriptionState),
        method: 'upload',
        uploadReference: 'rx-photo.pdf',
      },
      {
        'use-case': 'distance',
      },
      { attachment: { name: 'rx-photo.pdf', mimeType: 'application/pdf', size: 1024 } }
    );

    assert.equal(result.valid, true);
  });

  it('rejects unknown methods restored from untrusted state', () => {
    const prescription = {
      ...structuredClone(defaultPrescriptionState),
      method: 'unexpected',
    } as unknown as PrescriptionState;

    const result = validatePrescriptionState(prescription, { 'use-case': 'distance' });

    assert.equal(result.valid, false);
    assert.ok(result.errors.method);
  });

  it('rejects arbitrary powers, axes, and PD values', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.manual.rightSphereSign = '+';
    prescription.manual.rightSphereValue = '20.25';
    prescription.manual.leftSphereValue = '0.00';
    prescription.manual.rightCylinderSign = '-';
    prescription.manual.rightCylinderValue = '1.00';
    prescription.manual.rightAxis = '181';
    prescription.manual.pd = '64.2';

    const result = validatePrescriptionState(prescription, { 'use-case': 'distance' });

    assert.equal(result.valid, false);
    assert.ok(result.errors.rightSphere);
    assert.ok(result.errors.rightAxis);
    assert.ok(result.errors.pd);
  });

  it('does not offer or accept zero reading ADD', () => {
    assert.equal(readingAddOptions.includes('0.00'), false);
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.manual.rightSphereValue = '0.00';
    prescription.manual.leftSphereValue = '0.00';
    prescription.manual.pd = '64.0';
    prescription.manual.rightAddPower = '0.00';
    prescription.manual.leftAddPower = '0.00';

    const result = validatePrescriptionState(prescription, { 'use-case': 'varifocal' });

    assert.equal(result.valid, false);
    assert.ok(result.errors.rightAddPower);
    assert.ok(result.errors.leftAddPower);
  });

  it('accepts valid zero powers and boundary values', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.manual.rightSphereValue = '0.00';
    prescription.manual.leftSphereSign = '-';
    prescription.manual.leftSphereValue = '20.00';
    prescription.manual.rightCylinderValue = '0.00';
    prescription.manual.leftCylinderSign = '-';
    prescription.manual.leftCylinderValue = '6.00';
    prescription.manual.leftAxis = '180';
    prescription.manual.pd = '80.0';

    assert.equal(validatePrescriptionState(prescription, { 'use-case': 'distance' }).valid, true);
  });

  it('starts manual powers blank and keeps 64 mm as the default PD', () => {
    assert.equal(defaultPrescriptionState.manual.rightSphereValue, '');
    assert.equal(defaultPrescriptionState.manual.leftSphereValue, '');
    assert.equal(defaultPrescriptionState.manual.rightCylinderValue, '');
    assert.equal(defaultPrescriptionState.manual.leftCylinderValue, '');
    assert.equal(defaultPrescriptionState.manual.pd, '64.0');
    assert.equal(sphereOptions.includes('Plano'), false);
    assert.equal(sphereOptions.includes('Infinity'), false);
  });

  it('shows both ADD fields for intermediate lenses without blocking when they are missing', () => {
    const needs = getPrescriptionNeeds({ 'use-case': 'intermediate' });
    const result = validatePrescriptionState(selectZeroPowers(structuredClone(defaultPrescriptionState)), { 'use-case': 'intermediate' });

    assert.deepEqual(needs, { showReadingAdd: true, requireReadingAdd: false, showIntermediateAdd: true });
    assert.equal(result.valid, true);
  });

  it('warns but does not block when left and right ADD values differ', () => {
    const prescription = selectZeroPowers(structuredClone(defaultPrescriptionState));
    prescription.manual.rightAddPower = '1.50';
    prescription.manual.leftAddPower = '1.75';

    const result = validatePrescriptionState(prescription, { 'use-case': 'reading' });

    assert.equal(result.valid, true);
    assert.match(result.warnings.readingAddMismatch, /different/);
  });

  it('requires manual prism notation when the prism surcharge is selected', () => {
    const missing = validatePrescriptionState(structuredClone(defaultPrescriptionState), {
      'use-case': 'distance',
      prism: 'prism-required',
    });
    const prescription = selectZeroPowers(structuredClone(defaultPrescriptionState));
    prescription.manual.rightPrism = '2.00 base out';
    const entered = validatePrescriptionState(prescription, {
      'use-case': 'distance',
      prism: 'prism-required',
    });

    assert.equal(missing.valid, false);
    assert.ok(missing.errors.prism);
    assert.equal(entered.valid, true);
  });

  it('requests reading add values for Maui Jim reading and varifocal selections', () => {
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'maui-jim-sun', 'maui-jim-vision-type': 'maui-jim-varifocal' }).showReadingAdd, true);
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'maui-jim-sun', 'maui-jim-vision-type': 'maui-jim-reading' }).showReadingAdd, true);
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'maui-jim-sun', 'maui-jim-vision-type': 'maui-jim-distance' }).showReadingAdd, false);
  });

  it('requests reading add values for Luxottica varifocal branded lenses only', () => {
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'rayban-sun', 'luxottica-vision-type': 'luxottica-varifocal' }).showReadingAdd, true);
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'rayban-sun', 'luxottica-vision-type': 'luxottica-reading' }).showReadingAdd, true);
    assert.equal(getPrescriptionNeeds({ 'glazing-route': 'oakley-optical', 'luxottica-vision-type': 'luxottica-distance' }).showReadingAdd, false);
  });

  it('allows send-later prescription for supplier glazing', () => {
    const selections = {
      'glazing-route': 'rayban-sun',
      'luxottica-vision-type': 'luxottica-distance',
      'luxottica-lens-option': 'rayban-sun-single-vision-tint',
    };
    const result = validatePrescriptionState(
      {
        ...structuredClone(defaultPrescriptionState),
        method: 'later',
      },
      selections
    );

    assert.equal(getAvailablePrescriptionMethods(lensConfig, selections, getDefaultFrameContext()).includes('later'), true);
    assert.equal(result.valid, true);
  });

  it('rejects a method that is hidden by the current configuration', () => {
    const result = validatePrescriptionState(
      { ...structuredClone(defaultPrescriptionState), method: 'later' },
      { 'use-case': 'distance' },
      { availableMethods: ['manual', 'upload', 'saved'] }
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.method);
  });

  it('removes ADD values that are irrelevant to the final lens type', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.manual.rightAddPower = '1.50';
    prescription.manual.leftAddPower = '1.50';
    prescription.manual.rightIntermediateAdd = '1.00';
    prescription.manual.leftIntermediateAdd = '1.00';

    const distance = sanitizePrescriptionForSelections(prescription, { 'use-case': 'distance' });
    assert.equal(distance.manual.rightAddPower, '');
    assert.equal(distance.manual.leftAddPower, '');
    assert.equal(distance.manual.rightIntermediateAdd, '');
    assert.equal(distance.manual.leftIntermediateAdd, '');

    const reading = sanitizePrescriptionForSelections(prescription, { 'use-case': 'reading' });
    assert.equal(reading.manual.rightAddPower, '1.50');
    assert.equal(reading.manual.rightIntermediateAdd, '');
  });

  it('ignores stale intermediate ADD values when the selected lenses do not use them', () => {
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.method = 'manual';
    prescription.manual.rightSphereSign = '+';
    prescription.manual.rightSphereValue = '1.00';
    prescription.manual.leftSphereSign = '+';
    prescription.manual.leftSphereValue = '1.00';
    prescription.manual.rightCylinderValue = '0.00';
    prescription.manual.leftCylinderValue = '0.00';
    prescription.manual.pd = '64.0';
    prescription.manual.rightIntermediateAdd = '9.99';

    assert.equal(validatePrescriptionState(prescription, { 'use-case': 'distance' }).valid, true);
  });
});
