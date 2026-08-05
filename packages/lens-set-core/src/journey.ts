import { defaultPrescriptionState } from './frame-context';
import {
  calculatePriceBreakdown,
  calculateTotal,
  clearInvalidSelections,
  evaluateStepOptions,
  getAvailablePrescriptionMethods,
  getVisibleSteps,
  isBuilderFlowComplete,
  isStepSatisfied,
} from './builder';
import { buildLensCustomizationDraft } from './persistence';
import { normalizePrescriptionState, sanitizePrescriptionForSelections, validatePrescriptionState } from './prescription';
import { buildReviewSections } from './review';
import type {
  ComputedOption,
  FrameContext,
  JourneySnapshot,
  LensConfig,
  LensCustomizationDraft,
  LensStep,
  PrescriptionAttachmentMetadata,
  PrescriptionMethod,
  PrescriptionState,
  PriceLineItem,
  ReviewSection,
  SelectionMap,
} from './types';

/**
 * Framework-independent port of the original Svelte 5 journey store
 * (`app/lib/journey.svelte.ts`).
 *
 * The Svelte version used runes (`$state`, `$derived`, `$effect`) for
 * reactivity. This version implements the exact same state machine and derived
 * values with a plain observable class: `getState()` returns an immutable
 * snapshot of every derived value, and `subscribe(listener)` notifies on every
 * mutation. Host frameworks (React via `useSyncExternalStore`, Svelte, Vue, or
 * plain DOM) can consume it without any framework imports.
 */

const MAX_FRAME_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FRAME_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface JourneyFiles {
  prescriptionFile: File | null;
  reglazeFrameFile: File | null;
}

export interface JourneyState {
  phase: 'builder' | 'final';
  builderStepId: string | null;
  quoteId: string | null;
  frame: FrameContext;
  selections: SelectionMap;
  reglazeFrameDescription: string;
  reglazeFrameAttachment: PrescriptionAttachmentMetadata | null;
  reglazeFrameFileError: string;
  builderPath: LensStep[];
  builderIndex: number;
  currentBuilderStep: LensStep | null;
  currentBuilderOptions: ComputedOption[];
  priceItems: PriceLineItem[];
  totalPrice: number;
  prescription: PrescriptionState;
  prescriptionAttachment: PrescriptionAttachmentMetadata | null;
  prescriptionComplete: boolean;
  visiblePrescriptionErrors: Record<string, string>;
  prescriptionWarnings: Record<string, string>;
  journeyComplete: boolean;
  unresolvedSteps: string[];
  customizationDraft: LensCustomizationDraft;
  reviewSections: ReviewSection[];
  reviewEditingStepId: string | null;
  reviewNotice: string | null;
}

export type JourneyListener = (state: JourneyState) => void;

function createBlankJourneySnapshot(config: LensConfig, frame: FrameContext): JourneySnapshot {
  return {
    phase: 'builder',
    builderStepId: config.steps[0]?.id ?? null,
    quoteId: null,
    frame,
    selections: {},
    reglazeFrameDescription: '',
    prescription: structuredClone(defaultPrescriptionState) as PrescriptionState,
  };
}

function areSelectionMapsEqual(left: SelectionMap, right: SelectionMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areFramesCompatible(current: FrameContext, stored: FrameContext | null | undefined): boolean {
  if (!stored) {
    return false;
  }

  return current.frameSku === stored.frameSku && current.lensProductSku === stored.lensProductSku;
}

export function isInitialJourneySnapshot(config: LensConfig, snapshot: JourneySnapshot): boolean {
  return JSON.stringify(snapshot) === JSON.stringify(createBlankJourneySnapshot(config, snapshot.frame));
}

function applyFrameSelections(frame: FrameContext, selections: SelectionMap): FrameContext {
  if (frame.source !== 'reglaze') {
    return frame;
  }

  const selectedFrameType = selections['frame-type'];
  if (selectedFrameType !== 'full-rim' && selectedFrameType !== 'semi-rimless' && selectedFrameType !== 'rimless' && selectedFrameType !== 'wrap') {
    return frame;
  }

  return {
    ...frame,
    frameType: selectedFrameType,
  };
}

function createInitialSnapshot(config: LensConfig, entryFrame: FrameContext, snapshot: JourneySnapshot | null): JourneySnapshot {
  if (!snapshot || !areFramesCompatible(entryFrame, snapshot.frame)) {
    return createBlankJourneySnapshot(config, entryFrame);
  }

  const frame = applyFrameSelections(entryFrame, snapshot.selections ?? {});
  const selections = clearInvalidSelections(snapshot.selections ?? {}, config, frame);
  const prescription = normalizePrescriptionState(snapshot.prescription);
  const builderPath = getVisibleSteps(config, selections, frame);
  const firstUnresolved = builderPath.find((step) => !isStepSatisfied(config, step, selections, prescription, frame, null));
  const storedStepIndex = builderPath.findIndex((step) => step.id === snapshot.builderStepId);
  const unresolvedStepIndex = firstUnresolved ? builderPath.findIndex((step) => step.id === firstUnresolved.id) : -1;
  const shouldResumeAtUnresolved = Boolean(firstUnresolved)
    && (snapshot.phase === 'final' || storedStepIndex === -1 || unresolvedStepIndex < storedStepIndex);

  return {
    phase: shouldResumeAtUnresolved ? 'builder' : snapshot.phase,
    builderStepId: shouldResumeAtUnresolved ? firstUnresolved?.id ?? null : snapshot.builderStepId,
    quoteId: snapshot.quoteId,
    frame: entryFrame,
    selections,
    reglazeFrameDescription: snapshot.reglazeFrameDescription ?? '',
    prescription,
  };
}

export class JourneyController {
  private readonly config: LensConfig;
  private readonly entryFrame: FrameContext;

  private phase: 'builder' | 'final';
  private builderStepId: string | null;
  private quoteId: string | null;
  private frame: FrameContext;
  private selections: SelectionMap;
  private reglazeFrameDescription: string;
  private reglazeFrameFile: File | null;
  private reglazeFrameFileError: string;
  private prescription: PrescriptionState;
  private prescriptionFile: File | null;
  private prescriptionAttempted: boolean;
  private reviewEditingStepId: string | null;
  private reviewNotice: string | null;

  private readonly listeners = new Set<JourneyListener>();

  constructor(config: LensConfig, entryFrame: FrameContext, snapshot: JourneySnapshot | null = null) {
    this.config = config;
    this.entryFrame = entryFrame;
    const initial = createInitialSnapshot(config, entryFrame, snapshot);
    this.phase = initial.phase;
    this.builderStepId = initial.builderStepId;
    this.quoteId = initial.quoteId;
    this.frame = applyFrameSelections(initial.frame, initial.selections);
    this.selections = initial.selections;
    this.reglazeFrameDescription = initial.reglazeFrameDescription;
    this.reglazeFrameFile = null;
    this.reglazeFrameFileError = '';
    this.prescription = initial.prescription;
    this.prescriptionFile = null;
    this.prescriptionAttempted = false;
    this.reviewEditingStepId = null;
    this.reviewNotice = null;
    this.sync();
  }

  subscribe(listener: JourneyListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): JourneyState {
    const builderPath = getVisibleSteps(this.config, this.selections, this.frame);
    const builderIndex = (() => {
      if (!this.builderStepId) {
        return 0;
      }
      const index = builderPath.findIndex((step) => step.id === this.builderStepId);
      return index === -1 ? 0 : index;
    })();
    const currentBuilderStep = builderPath[builderIndex] ?? builderPath[0] ?? this.config.steps[0] ?? null;
    const prescriptionAttachment: PrescriptionAttachmentMetadata | null = this.prescriptionFile
      ? { name: this.prescriptionFile.name, mimeType: this.prescriptionFile.type, size: this.prescriptionFile.size }
      : null;
    const reglazeFrameAttachment: PrescriptionAttachmentMetadata | null = this.reglazeFrameFile
      ? { name: this.reglazeFrameFile.name, mimeType: this.reglazeFrameFile.type, size: this.reglazeFrameFile.size }
      : null;
    const prescriptionValidation = validatePrescriptionState(this.prescription, this.selections, {
      availableMethods: getAvailablePrescriptionMethods(this.config, this.selections, this.frame),
      attachment: prescriptionAttachment,
    });
    const priceItems = calculatePriceBreakdown(this.config, builderPath, this.selections, this.frame);
    const totalPrice = calculateTotal(priceItems, this.config.basePrice);

    return {
      phase: this.phase,
      builderStepId: this.builderStepId,
      quoteId: this.quoteId,
      frame: this.frame,
      selections: this.selections,
      reglazeFrameDescription: this.reglazeFrameDescription,
      reglazeFrameAttachment,
      reglazeFrameFileError: this.reglazeFrameFileError,
      builderPath,
      builderIndex,
      currentBuilderStep,
      currentBuilderOptions: evaluateStepOptions(this.config, currentBuilderStep, this.selections, this.frame),
      priceItems,
      totalPrice,
      prescription: this.prescription,
      prescriptionAttachment,
      prescriptionComplete: prescriptionValidation.valid,
      visiblePrescriptionErrors: this.prescriptionAttempted ? prescriptionValidation.errors : {},
      prescriptionWarnings: prescriptionValidation.warnings,
      journeyComplete: isBuilderFlowComplete(this.config, this.selections, this.prescription, this.frame, prescriptionAttachment),
      unresolvedSteps: builderPath
        .filter((step) => !isStepSatisfied(this.config, step, this.selections, this.prescription, this.frame, prescriptionAttachment))
        .map((step) => step.id),
      customizationDraft: buildLensCustomizationDraft({
        quoteId: this.quoteId,
        frame: this.frame,
        selections: this.selections,
        reglazeFrameDescription: this.reglazeFrameDescription,
        reglazeFrameAttachment,
        prescription: this.prescription,
        prescriptionAttachment,
        priceItems,
        totalPrice,
      }, this.config),
      reviewSections: buildReviewSections(this.config, this.selections, this.frame, this.prescription, prescriptionAttachment),
      reviewEditingStepId: this.reviewEditingStepId,
      reviewNotice: this.reviewNotice,
    };
  }

  getFiles(): JourneyFiles {
    return {
      prescriptionFile: this.prescriptionFile,
      reglazeFrameFile: this.reglazeFrameFile,
    };
  }

  /** Mirrors the Svelte `$effect`: reconcile frame, sanitize selections, fix step. */
  private sync(): void {
    for (let iteration = 0; iteration < 3; iteration++) {
      const nextFrame = applyFrameSelections(this.frame, this.selections);
      if (JSON.stringify(nextFrame) !== JSON.stringify(this.frame)) {
        this.frame = nextFrame;
        continue;
      }

      const sanitizedSelections = clearInvalidSelections(this.selections, this.config, nextFrame);
      if (!areSelectionMapsEqual(this.selections, sanitizedSelections)) {
        this.selections = sanitizedSelections;
        continue;
      }

      const builderPath = getVisibleSteps(this.config, this.selections, this.frame);
      if (this.builderStepId && !builderPath.some((step) => step.id === this.builderStepId)) {
        this.builderStepId = builderPath[0]?.id ?? null;
      }
      break;
    }
    this.notify();
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  setQuoteId(value: string | null): void {
    this.quoteId = value;
    this.notify();
  }

  setFrame(nextFrame: FrameContext): void {
    const resolvedFrame = applyFrameSelections(nextFrame, this.selections);
    this.frame = resolvedFrame;
    this.selections = clearInvalidSelections(this.selections, this.config, resolvedFrame);
    this.sync();
  }

  openReviewEditor(stepId: string): void {
    if (!getVisibleSteps(this.config, this.selections, this.frame).some((step) => step.id === stepId)) {
      return;
    }
    this.phase = 'final';
    this.builderStepId = stepId;
    this.reviewEditingStepId = stepId;
    this.reviewNotice = null;
    this.notify();
  }

  closeReviewEditor(): void {
    this.reviewEditingStepId = null;
    this.reviewNotice = null;
    this.notify();
  }

  setReviewNotice(message: string | null): void {
    this.reviewNotice = message;
    this.notify();
  }

  advanceReviewEditorTo(stepId: string, message: string | null = null): void {
    if (!getVisibleSteps(this.config, this.selections, this.frame).some((step) => step.id === stepId)) {
      return;
    }
    this.phase = 'final';
    this.builderStepId = stepId;
    this.reviewEditingStepId = stepId;
    this.reviewNotice = message;
    this.notify();
  }

  selectBuilderOption(stepId: string, optionId: string): void {
    this.selections = clearInvalidSelections({ ...this.selections, [stepId]: optionId }, this.config, this.frame);
    this.prescription = sanitizePrescriptionForSelections(this.prescription, this.selections);
    this.builderStepId = stepId;
    this.sync();
  }

  toggleBuilderOption(stepId: string, optionId: string): void {
    const current = this.selections[stepId];
    const values = Array.isArray(current) ? [...current] : [];
    const index = values.indexOf(optionId);

    const step = this.config.steps.find((candidate) => candidate.id === stepId);
    const group = step ? this.config.options[step.optionGroup] : this.config.options[stepId];
    const option = group?.options.find((candidate) => candidate.id === optionId);

    if (index === -1) {
      if (option?.exclusive) {
        values.splice(0, values.length, optionId);
      } else {
        const exclusiveIds = new Set(group?.options.filter((candidate) => candidate.exclusive).map((candidate) => candidate.id) ?? []);
        values.splice(0, values.length, ...values.filter((value) => !exclusiveIds.has(value)), optionId);
      }
    } else {
      values.splice(index, 1);
    }

    this.selections = clearInvalidSelections({ ...this.selections, [stepId]: values }, this.config, this.frame);
    this.builderStepId = stepId;
    this.sync();
  }

  selectColorOption(groupId: string, optionId: string): void {
    const option = this.config.options[groupId]?.options.find((candidate) => candidate.id === optionId);
    const nextSelections = { ...this.selections, [groupId]: optionId };
    if (option?.childOptionsGroup === 'tint-density' && !nextSelections['tint-density']) {
      nextSelections['tint-density'] = 'tint-density-85';
    }
    this.selections = clearInvalidSelections(nextSelections, this.config, this.frame);

    if (getVisibleSteps(this.config, this.selections, this.frame).some((step) => step.id === groupId)) {
      this.builderStepId = groupId;
    }
    this.sync();
  }

  updatePrescriptionField(field: 'method' | 'uploadReference' | 'savedReference', value: string): void {
    if (field === 'method') {
      const method = value as PrescriptionMethod | '';
      this.prescription = { ...this.prescription, method };
      if (method !== 'upload') {
        this.prescriptionFile = null;
        this.prescription = { ...this.prescription, uploadReference: '' };
      }
      this.sync();
      return;
    }

    if (field === 'uploadReference' || field === 'savedReference') {
      this.prescription = { ...this.prescription, [field]: value };
      this.sync();
    }
  }

  updatePrescriptionFile(file: File | null): void {
    this.prescriptionFile = file;
    this.prescription = { ...this.prescription, uploadReference: file?.name ?? '' };
    this.sync();
  }

  updateManualPrescription(field: keyof PrescriptionState['manual'], value: string): void {
    this.prescription = {
      ...this.prescription,
      manual: {
        ...this.prescription.manual,
        [field]: value,
      },
    };
    this.sync();
  }

  updateReglazeFrameDescription(value: string): void {
    this.reglazeFrameDescription = value;
    this.sync();
  }

  updateReglazeFrameFile(file: File | null): void {
    if (!file) {
      this.reglazeFrameFile = null;
      this.reglazeFrameFileError = '';
      this.sync();
      return;
    }
    if (!ACCEPTED_FRAME_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_FRAME_IMAGE_TYPES[number])) {
      this.reglazeFrameFile = null;
      this.reglazeFrameFileError = 'Upload a JPEG, PNG, or WebP image.';
      this.sync();
      return;
    }
    if (file.size <= 0 || file.size > MAX_FRAME_IMAGE_SIZE) {
      this.reglazeFrameFile = null;
      this.reglazeFrameFileError = 'Frame images must be no larger than 10 MB.';
      this.sync();
      return;
    }
    this.reglazeFrameFile = file;
    this.reglazeFrameFileError = '';
    this.sync();
  }

  attemptPrescription(): void {
    this.prescriptionAttempted = true;
    this.notify();
  }

  next(): void {
    if (this.phase === 'final') {
      return;
    }

    const state = this.getState();
    const { currentBuilderStep, builderPath, builderIndex, prescriptionComplete } = state;

    if (!currentBuilderStep) {
      this.phase = 'final';
      this.notify();
      return;
    }

    if (currentBuilderStep.id === 'prescription' && !prescriptionComplete) {
      this.prescriptionAttempted = true;
      this.notify();
      return;
    }

    if (!isStepSatisfied(this.config, currentBuilderStep, this.selections, this.prescription, this.frame, state.prescriptionAttachment)) {
      return;
    }

    const nextStep = builderPath[builderIndex + 1];
    if (!nextStep) {
      this.phase = 'final';
      this.notify();
      return;
    }

    this.builderStepId = nextStep.id;
    this.notify();
  }

  back(): void {
    if (this.phase === 'final') {
      const builderPath = getVisibleSteps(this.config, this.selections, this.frame);
      this.phase = 'builder';
      this.builderStepId = builderPath[builderPath.length - 1]?.id ?? builderPath[0]?.id ?? null;
      this.notify();
      return;
    }

    const builderPath = getVisibleSteps(this.config, this.selections, this.frame);
    const builderIndex = this.builderStepId ? builderPath.findIndex((step) => step.id === this.builderStepId) : 0;
    if (builderIndex > 0) {
      this.builderStepId = builderPath[builderIndex - 1]?.id ?? builderPath[0]?.id ?? null;
      this.notify();
    }
  }

  jumpToBuilderStep(stepId: string): void {
    if (!getVisibleSteps(this.config, this.selections, this.frame).some((step) => step.id === stepId)) {
      return;
    }
    this.phase = 'builder';
    this.builderStepId = stepId;
    this.notify();
  }

  reset(): void {
    const fresh = createBlankJourneySnapshot(this.config, this.entryFrame);
    this.phase = fresh.phase;
    this.builderStepId = fresh.builderStepId;
    this.quoteId = fresh.quoteId;
    this.frame = applyFrameSelections(fresh.frame, fresh.selections);
    this.selections = fresh.selections;
    this.reglazeFrameDescription = fresh.reglazeFrameDescription;
    this.reglazeFrameFile = null;
    this.reglazeFrameFileError = '';
    this.prescription = fresh.prescription;
    this.prescriptionFile = null;
    this.prescriptionAttempted = false;
    this.reviewEditingStepId = null;
    this.reviewNotice = null;
    this.sync();
  }

  restore(nextSnapshot: JourneySnapshot | null): void {
    if (!nextSnapshot) {
      return;
    }

    const restored = createInitialSnapshot(this.config, this.entryFrame, nextSnapshot);
    this.phase = restored.phase;
    this.builderStepId = restored.builderStepId;
    this.quoteId = restored.quoteId;
    this.frame = applyFrameSelections(restored.frame, restored.selections);
    this.selections = clearInvalidSelections(restored.selections, this.config, applyFrameSelections(restored.frame, restored.selections));
    this.reglazeFrameDescription = restored.reglazeFrameDescription;
    this.reglazeFrameFile = null;
    this.reglazeFrameFileError = '';
    this.prescription = restored.prescription;
    this.prescriptionFile = null;
    this.prescriptionAttempted = false;
    this.reviewEditingStepId = null;
    this.reviewNotice = null;
    this.sync();
  }

  snapshotState(): JourneySnapshot {
    return {
      phase: this.phase,
      builderStepId: this.builderStepId,
      quoteId: this.quoteId,
      frame: this.frame,
      selections: this.selections,
      reglazeFrameDescription: this.reglazeFrameDescription,
      prescription: {
        ...this.prescription,
        uploadReference: '',
      },
    };
  }
}

export function createJourneyController(config: LensConfig, entryFrame: FrameContext, snapshot: JourneySnapshot | null = null): JourneyController {
  return new JourneyController(config, entryFrame, snapshot);
}
