import { defaultPrescriptionState } from './frame-context';
import { officialSupplierRoutes } from './types';
import type { FrameContext, JourneySnapshot, SelectionMap } from './types';

const STORAGE_KEY = 'lens-set-customization-builder-v6';
const MIGRATABLE_STORAGE_KEY = 'lens-set-customization-builder-v5';
const LEGACY_STORAGE_KEYS = [MIGRATABLE_STORAGE_KEY, 'lens-set-customization-builder-v4', 'lens-set-customization-builder-v3'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isFrameContext(value: unknown): value is FrameContext {
  if (!isRecord(value) || !isRecord(value.restrictions)) return false;
  return typeof value.frameSku === 'string'
    && typeof value.frameName === 'string'
    && ['full-rim', 'semi-rimless', 'rimless', 'wrap'].includes(String(value.frameType))
    && isNullableFiniteNumber(value.framePrice)
    && (typeof value.frameImageUrl === 'string' || value.frameImageUrl === null)
    && typeof value.baseCurve === 'boolean'
    && isNullableFiniteNumber(value.eyeSize)
    && typeof value.lensProductSku === 'string'
    && (value.source === 'frame' || value.source === 'reglaze')
    && Array.isArray(value.supplierGlazingRoutes)
    && value.supplierGlazingRoutes.every((route) => officialSupplierRoutes.includes(route as typeof officialSupplierRoutes[number]))
    && (value.brandedLensRoute === 'standard' || officialSupplierRoutes.includes(value.brandedLensRoute as typeof officialSupplierRoutes[number]))
    && isStringArray(value.restrictions.disallowedOptions)
    && isStringArray(value.restrictions.notes);
}

function isSelectionMap(value: unknown): value is SelectionMap {
  return isRecord(value) && Object.values(value).every(
    (selection) => typeof selection === 'string' || isStringArray(selection)
  );
}

function isJourneySnapshot(value: unknown): value is JourneySnapshot {
  if (!isRecord(value)) return false;
  return (value.phase === 'builder' || value.phase === 'final')
    && (typeof value.builderStepId === 'string' || value.builderStepId === null)
    && (typeof value.quoteId === 'string' || value.quoteId === null)
    && isFrameContext(value.frame)
    && isSelectionMap(value.selections)
    && typeof value.reglazeFrameDescription === 'string'
    && isRecord(value.prescription);
}

function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function removeItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Browser storage is optional.
  }
}

function clearLegacySnapshots(storage: Storage): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    removeItem(storage, key);
  }
}

function writeSnapshot(storage: Storage, key: string, snapshot: JourneySnapshot): boolean {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

function readSnapshot(storage: Storage, key: string): JourneySnapshot | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isJourneySnapshot(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid or outdated snapshots are discarded below.
  }
  removeItem(storage, key);
  return null;
}

function redactSnapshot(snapshot: JourneySnapshot): JourneySnapshot {
  return {
    ...snapshot,
    quoteId: null,
    prescription: structuredClone(defaultPrescriptionState),
  };
}

export function loadSnapshot(): JourneySnapshot | null {
  const storage = getBrowserStorage();
  if (!storage) return null;

  const storedSnapshot = readSnapshot(storage, STORAGE_KEY);
  const legacySnapshot = storedSnapshot ? null : readSnapshot(storage, MIGRATABLE_STORAGE_KEY);
  const snapshot = storedSnapshot ?? legacySnapshot;
  if (!snapshot) {
    clearLegacySnapshots(storage);
    return null;
  }

  const safeSnapshot = redactSnapshot(snapshot);
  const wroteCurrentSnapshot = writeSnapshot(storage, STORAGE_KEY, safeSnapshot);
  if (legacySnapshot && !wroteCurrentSnapshot) {
    const keptRedactedLegacySnapshot = writeSnapshot(storage, MIGRATABLE_STORAGE_KEY, safeSnapshot);
    if (!keptRedactedLegacySnapshot) {
      removeItem(storage, MIGRATABLE_STORAGE_KEY);
    }
    for (const key of LEGACY_STORAGE_KEYS.slice(1)) {
      removeItem(storage, key);
    }
  } else {
    clearLegacySnapshots(storage);
  }
  return safeSnapshot;
}

export function saveSnapshot(snapshot: JourneySnapshot): void {
  const storage = getBrowserStorage();
  if (!storage) return;

  if (writeSnapshot(storage, STORAGE_KEY, redactSnapshot(snapshot))) {
    clearLegacySnapshots(storage);
  }
}

export function clearSnapshot(): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  removeItem(storage, STORAGE_KEY);
  clearLegacySnapshots(storage);
}
