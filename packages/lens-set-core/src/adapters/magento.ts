import type { LensCustomizationDraft, MagentoCustomizationEntry } from '../types';
import { formatSignedValue } from '../prescription';

export interface MagentoFrameReference {
  sku: string;
  name: string;
  type: string;
}

export interface MagentoLensQuotePayload {
  quoteId: string | null;
  configVersion: string;
  termsAccepted: boolean;
  frame: MagentoFrameReference;
  lensProductSku: string;
  supplier: LensCustomizationDraft['supplier'];
  customizations: MagentoCustomizationEntry[];
  prescription: MagentoPrescriptionIntent | null;
  frameImage: { field: 'frame_image'; name: string; mimeType: string; size: number } | null;
  pricing: {
    currencyCode: string;
    displayTotal: number;
    displayItems: Array<{
      code: string;
      label: string;
      price: number;
    }>;
  };
}

export type MagentoPrescriptionIntent =
  | {
      mode: 'manual';
      manual: {
        rightSphere: string;
        rightCylinder: string;
        rightAxis: string;
        leftSphere: string;
        leftCylinder: string;
        leftAxis: string;
        rightAddPower: string;
        leftAddPower: string;
        rightIntermediateAdd: string;
        leftIntermediateAdd: string;
        rightPrism: string;
        leftPrism: string;
        pd: string;
      };
    }
  | { mode: 'upload'; file: { field: 'prescription_file'; name: string; mimeType: string; size: number } }
  | { mode: 'saved'; reference: string }
  | { mode: 'later' };

function toMagentoPrescriptionIntent(draft: LensCustomizationDraft): MagentoPrescriptionIntent | null {
  const prescription = draft.prescription;
  if (!prescription) return null;
  if (prescription.method === 'manual') {
    return {
      mode: 'manual',
      manual: {
        rightSphere: formatSignedValue(prescription.manual.rightSphereSign, prescription.manual.rightSphereValue),
        rightCylinder: formatSignedValue(prescription.manual.rightCylinderSign, prescription.manual.rightCylinderValue),
        rightAxis: prescription.manual.rightAxis,
        leftSphere: formatSignedValue(prescription.manual.leftSphereSign, prescription.manual.leftSphereValue),
        leftCylinder: formatSignedValue(prescription.manual.leftCylinderSign, prescription.manual.leftCylinderValue),
        leftAxis: prescription.manual.leftAxis,
        rightAddPower: prescription.manual.rightAddPower,
        leftAddPower: prescription.manual.leftAddPower,
        rightIntermediateAdd: prescription.manual.rightIntermediateAdd,
        leftIntermediateAdd: prescription.manual.leftIntermediateAdd,
        rightPrism: prescription.manual.rightPrism.trim(),
        leftPrism: prescription.manual.leftPrism.trim(),
        pd: prescription.manual.pd,
      },
    };
  }
  if (prescription.method === 'upload') {
    return draft.prescriptionAttachment
      ? { mode: 'upload', file: { field: 'prescription_file', ...draft.prescriptionAttachment } }
      : null;
  }
  if (prescription.method === 'saved') {
    return { mode: 'saved', reference: prescription.savedReference.trim() };
  }
  return prescription.method === 'later' ? { mode: 'later' } : null;
}

export interface MagentoLensQuoteResponse {
  quoteId: string;
  status: 'draft' | 'submitted';
  customizationsSaved: number;
}

export function toMagentoLensQuotePayload(draft: LensCustomizationDraft): MagentoLensQuotePayload {
  return {
    quoteId: draft.quoteId,
    configVersion: draft.configVersion,
    termsAccepted: draft.termsAccepted,
    frame: {
      sku: draft.frame.frameSku,
      name: draft.frame.frameName,
      type: draft.frame.frameType,
    },
    lensProductSku: draft.lensProductSku,
    supplier: draft.supplier,
    customizations: draft.magentoCustomizations,
    prescription: toMagentoPrescriptionIntent(draft),
    frameImage: draft.reglazeFrameAttachment
      ? { field: 'frame_image', ...draft.reglazeFrameAttachment }
      : null,
    pricing: {
      currencyCode: draft.currencyCode,
      displayTotal: draft.displayTotal,
      displayItems: draft.displayItems.map((item) => ({
        code: item.optionId,
        label: item.optionTitle,
        price: item.price,
      })),
    },
  };
}

export function fromMagentoLensQuoteResponse(response: unknown): {
  quoteId: string;
  status: 'draft' | 'submitted';
} {
  if (!response || typeof response !== 'object') {
    throw new Error('Magento returned an invalid lens quote response');
  }
  const candidate = response as Partial<MagentoLensQuoteResponse>;
  if (typeof candidate.quoteId !== 'string' || candidate.quoteId.trim().length === 0) {
    throw new Error('Magento returned an invalid lens quote ID');
  }
  if (candidate.status !== 'draft' && candidate.status !== 'submitted') {
    throw new Error('Magento returned an invalid lens quote status');
  }
  return {
    quoteId: candidate.quoteId.trim(),
    status: candidate.status,
  };
}
