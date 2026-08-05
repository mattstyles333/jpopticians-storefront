import type {
  PrescriptionAttachmentMetadata,
  PrescriptionMethod,
  PrescriptionState,
  SelectionMap,
} from './types';
import { prescriptionMethods } from './types';
import { supplierGlazingNeedsReadingAdd } from './lens-config/supplier-glazing';

export interface PrescriptionNeeds {
  showReadingAdd: boolean;
  requireReadingAdd: boolean;
  showIntermediateAdd: boolean;
}

export interface PrescriptionValidationContext {
  availableMethods?: readonly PrescriptionMethod[];
  attachment?: PrescriptionAttachmentMetadata | null;
}

export interface PrescriptionValidation {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const MAX_PRESCRIPTION_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_PRESCRIPTION_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

function generateQuarterValues(min: number, max: number, includeZero = true): string[] {
  const values: string[] = includeZero ? ['0.00'] : [];

  for (let current = min; current <= max + 0.001; current += 0.25) {
    const rounded = Math.round(current * 100) / 100;
    values.push(rounded.toFixed(2));
  }
  return values;
}

function generateAxisValues(): string[] {
  return ['', ...Array.from({ length: 180 }, (_, index) => String(index + 1))];
}

function generateHalfStepValues(min: number, max: number): string[] {
  const values: string[] = [];
  for (let current = min; current <= max + 0.001; current += 0.5) {
    const rounded = Math.round(current * 10) / 10;
    values.push(rounded.toFixed(1));
  }
  return values;
}

export const sphereOptions = generateQuarterValues(0.25, 20);
export const cylinderOptions = generateQuarterValues(0.25, 6);
export const axisOptions = generateAxisValues();
export const readingAddOptions = generateQuarterValues(0.75, 3.5, false);
export const intermediateAddOptions = generateQuarterValues(0.5, 2.5, false);
export const pdOptions = generateHalfStepValues(50, 80);

export function formatSignedValue(sign: '+' | '-' | '', value: string): string {
  if (!value) {
    return '';
  }
  if (value === '0.00') {
    return '0.00';
  }
  return sign ? `${sign}${value}` : value;
}

export function getPrescriptionNeeds(selections: SelectionMap): PrescriptionNeeds {
  const lensUse = Array.isArray(selections['use-case']) ? selections['use-case'][0] : selections['use-case'];
  const requireReadingAdd = ['reading', 'bifocal', 'varifocal', 'occupational'].includes(lensUse ?? '')
    || supplierGlazingNeedsReadingAdd(selections);
  return {
    showReadingAdd: requireReadingAdd || lensUse === 'intermediate',
    requireReadingAdd,
    showIntermediateAdd: lensUse === 'intermediate',
  };
}

export function sanitizePrescriptionForSelections(
  prescription: PrescriptionState,
  selections: SelectionMap
): PrescriptionState {
  const needs = getPrescriptionNeeds(selections);
  const prism = Array.isArray(selections.prism) ? selections.prism[0] : selections.prism;
  return {
    ...prescription,
    manual: {
      ...prescription.manual,
      ...(!needs.showReadingAdd ? { rightAddPower: '', leftAddPower: '' } : {}),
      ...(!needs.showIntermediateAdd ? { rightIntermediateAdd: '', leftIntermediateAdd: '' } : {}),
      ...(prism !== 'prism-required' ? { rightPrism: '', leftPrism: '' } : {}),
    },
  };
}

function isPrescriptionMethod(value: unknown): value is PrescriptionMethod {
  return typeof value === 'string' && prescriptionMethods.includes(value as PrescriptionMethod);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizePrescriptionState(value: unknown): PrescriptionState {
  const source = isRecord(value) ? value : {};
  const manual = isRecord(source.manual) ? source.manual : {};
  const sign = (candidate: unknown): '+' | '-' | '' => candidate === '+' || candidate === '-' ? candidate : '';
  return {
    method: isPrescriptionMethod(source.method) ? source.method : '',
    uploadReference: stringValue(source.uploadReference),
    savedReference: stringValue(source.savedReference),
    manual: {
      rightSphereSign: sign(manual.rightSphereSign),
      rightSphereValue: stringValue(manual.rightSphereValue),
      rightCylinderSign: sign(manual.rightCylinderSign),
      rightCylinderValue: stringValue(manual.rightCylinderValue),
      rightAxis: stringValue(manual.rightAxis),
      leftSphereSign: sign(manual.leftSphereSign),
      leftSphereValue: stringValue(manual.leftSphereValue),
      leftCylinderSign: sign(manual.leftCylinderSign),
      leftCylinderValue: stringValue(manual.leftCylinderValue),
      leftAxis: stringValue(manual.leftAxis),
      rightAddPower: stringValue(manual.rightAddPower),
      leftAddPower: stringValue(manual.leftAddPower),
      rightIntermediateAdd: stringValue(manual.rightIntermediateAdd),
      leftIntermediateAdd: stringValue(manual.leftIntermediateAdd),
      rightPrism: stringValue(manual.rightPrism),
      leftPrism: stringValue(manual.leftPrism),
      pd: stringValue(manual.pd) || '64.0',
    },
  };
}

function validatePower(
  errors: Record<string, string>,
  label: string,
  valueKey: string,
  signKey: string,
  value: string,
  sign: string,
  options: readonly string[]
): void {
  if (!options.includes(value)) {
    errors[valueKey] = `Select a valid value for ${label}.`;
    return;
  }
  if (sign !== '' && sign !== '+' && sign !== '-') {
    errors[signKey] = `Choose a valid sign for ${label}.`;
  } else if (value !== '0.00' && !sign) {
    errors[signKey] = `Choose + or - for ${label}.`;
  }
}

function validateCylinder(
  errors: Record<string, string>,
  side: 'right' | 'left',
  value: string,
  sign: string,
  axis: string
): void {
  const valueKey = `${side}Cylinder`;
  const signKey = `${side}CylinderSign`;
  const axisKey = `${side}Axis`;
  if (!cylinderOptions.includes(value)) {
    errors[valueKey] = `Select a valid value for ${side} eye CYL.`;
    return;
  }
  if (sign !== '' && sign !== '+' && sign !== '-') {
    errors[signKey] = `Choose a valid sign for ${side} eye CYL.`;
  }
  if (value !== '0.00') {
    if (!sign) errors[signKey] = `Choose + or - for ${side} eye CYL.`;
    if (!axisOptions.includes(axis) || !axis) errors[axisKey] = 'Axis must be a whole number from 1 to 180.';
  }
}

export function validatePrescriptionState(
  prescription: PrescriptionState,
  selections: SelectionMap,
  context: PrescriptionValidationContext = {}
): PrescriptionValidation {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const needs = getPrescriptionNeeds(selections);

  if (!isPrescriptionMethod(prescription.method)) {
    errors.method = 'Choose how you want to send your prescription.';
    return { valid: false, errors, warnings };
  }
  if (context.availableMethods && !context.availableMethods.includes(prescription.method)) {
    errors.method = 'This prescription method is not available for the selected lenses.';
  }
  if (prescription.method === 'manual') {
    const manual = prescription.manual;
    validatePower(errors, 'right eye SPH', 'rightSphere', 'rightSphereSign', manual.rightSphereValue, manual.rightSphereSign, sphereOptions);
    validatePower(errors, 'left eye SPH', 'leftSphere', 'leftSphereSign', manual.leftSphereValue, manual.leftSphereSign, sphereOptions);
    validateCylinder(errors, 'right', manual.rightCylinderValue, manual.rightCylinderSign, manual.rightAxis);
    validateCylinder(errors, 'left', manual.leftCylinderValue, manual.leftCylinderSign, manual.leftAxis);

    if (!pdOptions.includes(manual.pd)) {
      errors.pd = 'Select a valid PD value from 50 to 80 mm.';
    }
    if (needs.requireReadingAdd && !readingAddOptions.includes(manual.rightAddPower)) {
      errors.rightAddPower = 'Select a valid reading ADD for the right eye.';
    }
    if (needs.requireReadingAdd && !readingAddOptions.includes(manual.leftAddPower)) {
      errors.leftAddPower = 'Select a valid reading ADD for the left eye.';
    }
    if (needs.showIntermediateAdd && manual.rightIntermediateAdd && !intermediateAddOptions.includes(manual.rightIntermediateAdd)) {
      errors.rightIntermediateAdd = 'Select a valid intermediate ADD for the right eye.';
    }
    if (needs.showIntermediateAdd && manual.leftIntermediateAdd && !intermediateAddOptions.includes(manual.leftIntermediateAdd)) {
      errors.leftIntermediateAdd = 'Select a valid intermediate ADD for the left eye.';
    }
    if (manual.rightAddPower && manual.leftAddPower && manual.rightAddPower !== manual.leftAddPower) {
      warnings.readingAddMismatch = 'The right and left reading ADD values are different. We will check these before manufacture.';
    }
    if (manual.rightIntermediateAdd && manual.leftIntermediateAdd && manual.rightIntermediateAdd !== manual.leftIntermediateAdd) {
      warnings.intermediateAddMismatch = 'The right and left intermediate ADD values are different. We will check these before manufacture.';
    }
    const prism = Array.isArray(selections.prism) ? selections.prism[0] : selections.prism;
    if (prism === 'prism-required' && !manual.rightPrism.trim() && !manual.leftPrism.trim()) {
      errors.prism = 'Enter the prism exactly as written for at least one eye.';
    }
  }

  if (prescription.method === 'upload') {
    const attachment = context.attachment;
    if (!attachment) {
      errors.uploadReference = 'Choose a prescription image or PDF.';
    } else if (!ACCEPTED_PRESCRIPTION_MIME_TYPES.includes(attachment.mimeType as typeof ACCEPTED_PRESCRIPTION_MIME_TYPES[number])) {
      errors.uploadReference = 'Upload a JPEG, PNG, WebP, or PDF file.';
    } else if (attachment.size <= 0 || attachment.size > MAX_PRESCRIPTION_FILE_SIZE) {
      errors.uploadReference = 'Prescription files must be no larger than 10 MB.';
    }
  }

  if (prescription.method === 'saved' && !prescription.savedReference.trim()) {
    errors.savedReference = 'Enter the saved prescription reference.';
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings };
}
