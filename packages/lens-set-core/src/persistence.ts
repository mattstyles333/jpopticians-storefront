import { fromMagentoLensQuoteResponse, toMagentoLensQuotePayload } from './adapters/magento';
import { getOptionById, hasActiveParentSelection, isBuilderFlowComplete } from './builder';
import { lensConfig } from './lens-config';
import { sanitizePrescriptionForSelections } from './prescription';
import type { FrameContext, LensCustomizationDraft, MagentoCustomizationEntry, PrescriptionAttachmentMetadata, PrescriptionState, PriceLineItem, SelectionMap } from './types';
import { backendData as defaultBackendData, type BackendDataStore } from './backend-data';
import { defaultPrescriptionState } from './frame-context';
import {
  getSelectedSupplierLensId,
  getSelectedSupplierGlazingRouteConfig,
  supplierGlazingRequiresPrescription,
} from './lens-config/supplier-glazing';

const MOCK_DRAFT_STORAGE_KEY = 'lens-set-mock-quote-drafts-v1';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

const lensFamilyByUseCase: Record<string, string> = {
  distance: 'single-vision',
  reading: 'single-vision',
  intermediate: 'single-vision',
  bifocal: 'progressive',
  varifocal: 'progressive',
  occupational: 'progressive',
  'frame-only': 'non-prescription',
  'fashion-lenses': 'non-prescription',
};

interface BuildDraftInput {
  quoteId: string | null;
  termsAccepted?: boolean;
  frame: FrameContext;
  selections: SelectionMap;
  reglazeFrameDescription: string;
  reglazeFrameAttachment?: PrescriptionAttachmentMetadata | null;
  prescription: PrescriptionState;
  prescriptionAttachment?: PrescriptionAttachmentMetadata | null;
  priceItems: PriceLineItem[];
  totalPrice: number;
}

export interface QuotePersistence {
  upsertDraft(draft: LensCustomizationDraft): Promise<{ quoteId: string; savedAt: string }>;
  submitDraft(draft: LensCustomizationDraft, prescriptionFile?: File | null, reglazeFrameFile?: File | null): Promise<{ quoteId: string; status: 'submitted' }>;
}

export interface MagentoQuotePersistenceOptions {
  submitUrl: string | null;
  fetchImpl?: typeof fetch;
  config?: typeof lensConfig;
  backendData?: BackendDataStore;
  requestTimeoutMs?: number;
}

async function fetchJsonWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new Error('The Magento request timed out. Please try again.'));
    }, timeoutMs);
  });
  const request = (async () => {
    const response = await fetchImpl(input, { ...init, signal: controller.signal });
    const payload: unknown = response.ok ? await response.json() : null;
    return { response, payload };
  })();

  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    if (didTimeout) {
      throw new Error('The Magento request timed out. Please try again.');
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function assertDraftSubmittable(
  config: typeof lensConfig,
  draft: LensCustomizationDraft,
  prescriptionFile?: File | null,
  reglazeFrameFile?: File | null
): void {
  const prescription = draft.prescription ?? structuredClone(defaultPrescriptionState);
  if (!isBuilderFlowComplete(config, draft.selections, prescription, draft.frame, draft.prescriptionAttachment)) {
    throw new Error('The lens configuration is incomplete or invalid');
  }
  if (!draft.termsAccepted) {
    throw new Error('Accept the Spex4Less terms before submitting the order');
  }
  if (draft.prescription?.method === 'upload') {
    if (!prescriptionFile || !draft.prescriptionAttachment) {
      throw new Error('The selected prescription file is no longer available');
    }
    const metadata = draft.prescriptionAttachment;
    if (prescriptionFile.name !== metadata.name || prescriptionFile.type !== metadata.mimeType || prescriptionFile.size !== metadata.size) {
      throw new Error('The selected prescription file does not match the reviewed attachment');
    }
  }
  if (draft.reglazeFrameAttachment) {
    if (!reglazeFrameFile) {
      throw new Error('The selected frame image is no longer available');
    }
    const metadata = draft.reglazeFrameAttachment;
    if (reglazeFrameFile.name !== metadata.name || reglazeFrameFile.type !== metadata.mimeType || reglazeFrameFile.size !== metadata.size) {
      throw new Error('The selected frame image does not match the reviewed attachment');
    }
  }
}

export function buildMagentoCustomizations(
  selections: SelectionMap,
  reglazeFrameDescription = '',
  config = lensConfig
): MagentoCustomizationEntry[] {
  const entries: MagentoCustomizationEntry[] = [];
  const stepIds = new Set(config.steps.map((step) => step.id));

  for (const [selectionKey, selection] of Object.entries(selections)) {
    if (!selection) {
      continue;
    }

    const step = config.steps.find((candidate) => candidate.id === selectionKey);
    const group = step ? config.options[step.optionGroup] : config.options[selectionKey];
    if (!group) {
      continue;
    }

    if (!stepIds.has(selectionKey) && !hasActiveParentSelection(config, selectionKey, selections)) {
      continue;
    }

    if (Array.isArray(selection)) {
      const option = group.options.find((candidate) => candidate.id === selection[0]);
      entries.push({
        code: option?.magentoCode ?? selectionKey,
        value: selection,
      });
      continue;
    }

    const option = getOptionById(config, step?.id ?? selectionKey, selection);
    entries.push({
      code: option?.magentoCode ?? selectionKey,
      value: selection,
    });
  }

  const selectedUseCase = Array.isArray(selections['use-case']) ? selections['use-case'][0] : selections['use-case'];
  const derivedLensFamily = selectedUseCase ? lensFamilyByUseCase[selectedUseCase] : undefined;
  if (derivedLensFamily && !entries.some((entry) => entry.code === 'lens_family')) {
    entries.unshift({ code: 'lens_family', value: derivedLensFamily });
  }

  if (!entries.some((entry) => entry.code === 'glazing_route')) {
    entries.unshift({ code: 'glazing_route', value: 'spex4less' });
  }

  if (reglazeFrameDescription.trim().length > 0) {
    entries.push({ code: 'frame_description', value: reglazeFrameDescription.trim() });
  }

  return entries;
}

export function buildLensCustomizationDraft(input: BuildDraftInput, config = lensConfig): LensCustomizationDraft {
  const requiresPrescription = selectionsNeedPrescription(input.selections);
  const prescription = requiresPrescription
    ? sanitizePrescriptionForSelections(input.prescription, input.selections)
    : null;
  const reglazeFrameDescription = input.reglazeFrameDescription.trim();
  const supplierRoute = getSelectedSupplierGlazingRouteConfig(input.selections);
  const magentoCustomizations = buildMagentoCustomizations(
    input.selections,
    reglazeFrameDescription,
    config
  );

  return {
    quoteId: input.quoteId,
    configVersion: config.version,
    currencyCode: config.currency.code,
    termsAccepted: input.termsAccepted ?? false,
    frame: input.frame,
    lensProductSku: input.frame.lensProductSku,
    supplier: supplierRoute
      ? {
          route: supplierRoute.id,
          lensId: getSelectedSupplierLensId(input.selections),
        }
      : null,
    selections: input.selections,
    reglazeFrameDescription,
    reglazeFrameAttachment: input.reglazeFrameAttachment ?? null,
    prescription,
    prescriptionAttachment: requiresPrescription ? input.prescriptionAttachment ?? null : null,
    displayItems: input.priceItems,
    displayTotal: input.totalPrice,
    magentoCustomizations,
  };
}

function selectionsNeedPrescription(selections: SelectionMap): boolean {
  if (supplierGlazingRequiresPrescription(selections)) {
    return true;
  }

  const useCase = Array.isArray(selections['use-case']) ? selections['use-case'][0] : selections['use-case'];
  return useCase !== 'frame-only' && useCase !== 'fashion-lenses';
}

function loadDraftMap(): Record<string, LensCustomizationDraft> {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  const raw = localStorage.getItem(MOCK_DRAFT_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, LensCustomizationDraft>;
  } catch {
    localStorage.removeItem(MOCK_DRAFT_STORAGE_KEY);
    return {};
  }
}

function saveDraftMap(drafts: Record<string, LensCustomizationDraft>): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(MOCK_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${Date.now()}`;
}

export function createMockQuotePersistence(config = lensConfig): QuotePersistence {
  return {
    async upsertDraft(draft) {
      const quoteId = draft.quoteId ?? createId();
      const drafts = loadDraftMap();
      const savedDraft = { ...draft, quoteId };
      drafts[quoteId] = savedDraft;
      saveDraftMap(drafts);

      return {
        quoteId,
        savedAt: new Date().toISOString(),
      };
    },
    async submitDraft(draft, prescriptionFile, reglazeFrameFile) {
      assertDraftSubmittable(config, draft, prescriptionFile, reglazeFrameFile);
      const quoteId = draft.quoteId ?? createId();
      const drafts = loadDraftMap();
      drafts[quoteId] = { ...draft, quoteId };
      saveDraftMap(drafts);

      return {
        quoteId,
        status: 'submitted',
      };
    },
  };
}

export function createMagentoQuotePersistence(options: MagentoQuotePersistenceOptions): QuotePersistence {
  const fetchImpl = options.fetchImpl ?? fetch;
  const backend = options.backendData ?? defaultBackendData;
  const config = options.config ?? lensConfig;
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  return {
    async upsertDraft(draft) {
      if (!options.submitUrl) {
        throw new Error('Magento submit URL is not configured');
      }

      const { response, payload } = await fetchJsonWithTimeout(fetchImpl, options.submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toMagentoLensQuotePayload(draft)),
      }, requestTimeoutMs);

      if (!response.ok) {
        throw new Error(`Failed to save quote draft (${response.status})`);
      }

      const normalized = fromMagentoLensQuoteResponse(payload);

      return {
        quoteId: normalized.quoteId,
        savedAt: new Date().toISOString(),
      };
    },
    async submitDraft(draft, prescriptionFile, reglazeFrameFile) {
       assertDraftSubmittable(config, draft, prescriptionFile, reglazeFrameFile);
      if (!options.submitUrl) {
        throw new Error('Magento submit URL is not configured');
      }

      let jsonPayload = toMagentoLensQuotePayload(draft);

      let formData = new FormData();
      let formKey  = backend.getFormKey();
      if (formKey) {
        formData.append('form_key', formKey);
      }
      formData.append('configuration', JSON.stringify(jsonPayload));
      formData.append('backend_data', JSON.stringify(backend.getData()));

      if (draft.prescription?.method === 'upload' && prescriptionFile) {
        formData.append('prescription_file', prescriptionFile, prescriptionFile.name);
      }
      if (draft.reglazeFrameAttachment && reglazeFrameFile) {
        formData.append('frame_image', reglazeFrameFile, reglazeFrameFile.name);
      }
      const { response, payload } = await fetchJsonWithTimeout(fetchImpl, options.submitUrl, {
        method: 'POST',
        body: formData,
      }, requestTimeoutMs);

      if (!response.ok) {
          throw new Error(`Failed to submit quote draft (${response.status})`);
      }

      const normalized = fromMagentoLensQuoteResponse(payload);
      if (normalized.status !== 'submitted') {
        throw new Error('Magento did not confirm the lens quote submission');
      }

      return {
        quoteId: normalized.quoteId,
        status: 'submitted',
      };
    },
  };
}
