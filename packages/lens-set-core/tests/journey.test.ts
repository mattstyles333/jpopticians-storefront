import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createJourneyController } from '../src/journey';
import { defaultPrescriptionState, getDefaultFrameContext } from '../src/frame-context';
import { lensConfig } from '../src/lens-config';
import type { PrescriptionState } from '../src/types';

function fillPrescriptionForVarifocal(prescription: PrescriptionState): PrescriptionState {
  prescription.method = 'manual';
  prescription.manual.rightSphereValue = '0.00';
  prescription.manual.rightCylinderValue = '0.00';
  prescription.manual.leftSphereValue = '0.00';
  prescription.manual.leftCylinderValue = '0.00';
  prescription.manual.rightAddPower = '2.00';
  prescription.manual.leftAddPower = '2.00';
  prescription.manual.pd = '64.0';
  return prescription;
}

describe('journey controller', () => {
  it('starts on the first visible step with a blank snapshot', () => {
    const frame = getDefaultFrameContext();
    const journey = createJourneyController(lensConfig, frame);

    const state = journey.getState();
    assert.equal(state.phase, 'builder');
    assert.equal(state.builderPath[0]?.id, 'use-case');
    assert.deepEqual(state.selections, {});
    assert.equal(state.builderIndex, 0);
    assert.equal(state.totalPrice, 0);
  });

  it('walks a complete standard-glazing varifocal journey and prices it', () => {
    const journey = createJourneyController(lensConfig, getDefaultFrameContext());

    journey.selectBuilderOption('use-case', 'varifocal');
    journey.next();
    assert.equal(journey.getState().currentBuilderStep?.id, 'lens-design');

    journey.selectBuilderOption('lens-design', 'varifocal-premium');
    journey.next();
    assert.equal(journey.getState().currentBuilderStep?.id, 'prism');

    journey.selectBuilderOption('prism', 'no-prism');
    journey.next();
    assert.equal(journey.getState().currentBuilderStep?.id, 'prescription');

    const prescription = fillPrescriptionForVarifocal(structuredClone(defaultPrescriptionState));
    for (const [field, value] of Object.entries(prescription.manual)) {
      journey.updateManualPrescription(field as keyof PrescriptionState['manual'], value);
    }
    journey.updatePrescriptionField('method', 'manual');

    assert.equal(journey.getState().prescriptionComplete, true);
    journey.next();
    assert.equal(journey.getState().currentBuilderStep?.id, 'tint');

    journey.selectBuilderOption('tint', 'clear');
    journey.next();
    assert.equal(journey.getState().currentBuilderStep?.id, 'package');

    journey.selectBuilderOption('package', 'essential-package');

    const state = journey.getState();
    assert.equal(state.journeyComplete, true);
    assert.equal(state.totalPrice, 120);

    journey.next();
    assert.equal(journey.getState().phase, 'final');
  });

  it('auto-selects the standard tint density and drops nested selections on parent change', () => {
    const journey = createJourneyController(lensConfig, getDefaultFrameContext());
    journey.selectBuilderOption('use-case', 'distance');
    journey.selectBuilderOption('lens-design', 'sv-distance-standard');
    journey.selectBuilderOption('prism', 'no-prism');
    journey.selectBuilderOption('prescription', 'later');
    journey.selectBuilderOption('tint', 'sunglasses');
    journey.selectColorOption('tint-colour', 'sunglasses-grey');

    assert.equal(journey.getState().selections['tint-density'], 'tint-density-85');

    journey.selectBuilderOption('tint', 'clear');
    assert.equal(journey.getState().selections['tint-colour'], undefined);
    assert.equal(journey.getState().selections['tint-density'], undefined);
  });

  it('discards an incompatible stored snapshot and starts fresh', () => {
    const journey = createJourneyController(lensConfig, getDefaultFrameContext());
    journey.selectBuilderOption('use-case', 'reading');
    const snapshot = journey.snapshotState();

    const otherFrame = { ...getDefaultFrameContext(), frameSku: 'FRAME-OTHER' };
    const restored = createJourneyController(lensConfig, otherFrame, snapshot);

    assert.deepEqual(restored.getState().selections, {});
  });

  it('restores a compatible snapshot and resumes at the first unresolved step', () => {
    const journey = createJourneyController(lensConfig, getDefaultFrameContext());
    journey.selectBuilderOption('use-case', 'reading');
    journey.selectBuilderOption('lens-design', 'sv-reading-standard');
    const snapshot = journey.snapshotState();

    const restored = createJourneyController(lensConfig, getDefaultFrameContext(), snapshot);
    const state = restored.getState();
    assert.equal(state.selections['use-case'], 'reading');
    assert.equal(state.selections['lens-design'], 'sv-reading-standard');
    assert.equal(state.builderPath.some((step) => step.id === 'prism'), true);
  });

  it('notifies subscribers on mutation and stops after unsubscribe', () => {
    const journey = createJourneyController(lensConfig, getDefaultFrameContext());
    let notifications = 0;
    const unsubscribe = journey.subscribe(() => {
      notifications += 1;
    });
    journey.selectBuilderOption('use-case', 'distance');
    assert.ok(notifications > 0);

    unsubscribe();
    const before = notifications;
    journey.selectBuilderOption('use-case', 'reading');
    assert.equal(notifications, before);
  });
});
