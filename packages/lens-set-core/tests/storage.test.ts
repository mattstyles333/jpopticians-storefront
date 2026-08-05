import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultPrescriptionState, getDefaultFrameContext } from '../src/frame-context';
import { clearSnapshot, loadSnapshot, saveSnapshot } from '../src/storage';
import type { JourneySnapshot } from '../src/types';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class RejectV6Storage extends MemoryStorage {
  rejectV6Writes = true;

  override setItem(key: string, value: string) {
    if (this.rejectV6Writes && key === 'lens-set-customization-builder-v6') {
      throw new Error('Quota exceeded');
    }
    super.setItem(key, value);
  }
}

describe('journey storage', () => {
  it('persists lens choices without prescription values or quote IDs', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

    try {
      const prescription = structuredClone(defaultPrescriptionState);
      prescription.manual.rightSphereSign = '+';
      prescription.manual.rightSphereValue = '1.00';
      prescription.manual.pd = '64.0';
      const snapshot: JourneySnapshot = {
        phase: 'builder',
        builderStepId: 'prescription',
        quoteId: 'quote-1',
        frame: getDefaultFrameContext(),
        selections: { 'use-case': 'distance', 'lens-design': 'sv-distance-standard' },
        reglazeFrameDescription: '',
        prescription,
      };

      saveSnapshot(snapshot);
      const restored = loadSnapshot();

      assert.equal(restored?.quoteId, null);
      assert.deepEqual(restored?.selections, snapshot.selections);
      assert.deepEqual(restored?.prescription, defaultPrescriptionState);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('discards structurally invalid snapshots', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new MemoryStorage();
    storage.setItem('lens-set-customization-builder-v6', JSON.stringify({ phase: 'final' }));
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

    try {
      assert.equal(loadSnapshot(), null);
      assert.equal(storage.getItem('lens-set-customization-builder-v6'), null);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('migrates v5 choices while removing prescription values and quote IDs', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new MemoryStorage();
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.method = 'saved';
    prescription.savedReference = 'RX-123';
    const snapshot: JourneySnapshot = {
      phase: 'final',
      builderStepId: 'package',
      quoteId: 'quote-1',
      frame: getDefaultFrameContext(),
      selections: { 'use-case': 'distance', tint: 'clear' },
      reglazeFrameDescription: 'Black acetate frame',
      prescription,
    };
    storage.setItem('lens-set-customization-builder-v5', JSON.stringify(snapshot));
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

    try {
      const restored = loadSnapshot();
      const migrated = JSON.parse(String(storage.getItem('lens-set-customization-builder-v6'))) as JourneySnapshot;

      assert.deepEqual(restored?.selections, snapshot.selections);
      assert.equal(restored?.quoteId, null);
      assert.deepEqual(restored?.prescription, defaultPrescriptionState);
      assert.equal(migrated.quoteId, null);
      assert.deepEqual(migrated.prescription, defaultPrescriptionState);
      assert.equal(storage.getItem('lens-set-customization-builder-v5'), null);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('treats a throwing localStorage getter as unavailable', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage blocked');
      },
    });
    const snapshot: JourneySnapshot = {
      phase: 'builder',
      builderStepId: 'use-case',
      quoteId: null,
      frame: getDefaultFrameContext(),
      selections: {},
      reglazeFrameDescription: '',
      prescription: structuredClone(defaultPrescriptionState),
    };

    try {
      assert.equal(loadSnapshot(), null);
      assert.doesNotThrow(() => saveSnapshot(snapshot));
      assert.doesNotThrow(() => clearSnapshot());
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('keeps a redacted v5 recovery snapshot when the v6 migration write fails', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new RejectV6Storage();
    const prescription = structuredClone(defaultPrescriptionState);
    prescription.method = 'saved';
    prescription.savedReference = 'RX-123';
    const snapshot: JourneySnapshot = {
      phase: 'final',
      builderStepId: 'package',
      quoteId: 'quote-1',
      frame: getDefaultFrameContext(),
      selections: { 'use-case': 'distance', tint: 'clear' },
      reglazeFrameDescription: '',
      prescription,
    };
    storage.setItem('lens-set-customization-builder-v5', JSON.stringify(snapshot));
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

    try {
      const restored = loadSnapshot();
      const fallback = JSON.parse(String(storage.getItem('lens-set-customization-builder-v5'))) as JourneySnapshot;

      assert.deepEqual(restored?.selections, snapshot.selections);
      assert.equal(storage.getItem('lens-set-customization-builder-v6'), null);
      assert.equal(fallback.quoteId, null);
      assert.deepEqual(fallback.prescription, defaultPrescriptionState);

      storage.rejectV6Writes = false;
      assert.deepEqual(loadSnapshot()?.selections, snapshot.selections);
      assert.notEqual(storage.getItem('lens-set-customization-builder-v6'), null);
      assert.equal(storage.getItem('lens-set-customization-builder-v5'), null);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});
