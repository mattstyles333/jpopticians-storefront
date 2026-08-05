export type SelectionValue = string | string[];
export type SelectionMap = Record<string, SelectionValue>;

export const glazingRoutes = [
  'spex4less',
  'rayban-sun',
  'rayban-optical',
  'oakley-sun',
  'oakley-optical',
  'maui-jim-sun',
] as const;

export type GlazingRoute = (typeof glazingRoutes)[number];
export type SupplierGlazingRoute = Exclude<GlazingRoute, 'spex4less'>;
export type BrandedLensRoute = SupplierGlazingRoute | 'standard';

export const officialSupplierRoutes: SupplierGlazingRoute[] = glazingRoutes.filter(
  (route): route is SupplierGlazingRoute => route !== 'spex4less'
);

const glazingRouteAliases: Record<string, SupplierGlazingRoute> = {
  'rayban-ophthalmic': 'rayban-optical',
  'oakley-ophthalmic': 'oakley-optical',
};

export function normalizeSupplierGlazingRoute(value: unknown): SupplierGlazingRoute | null {
  const route = String(value).trim();
  const normalized = glazingRouteAliases[route] ?? route;

  return officialSupplierRoutes.includes(normalized as SupplierGlazingRoute) ? (normalized as SupplierGlazingRoute) : null;
}

export interface FrameContext {
  frameSku: string;
  frameName: string;
  frameType: 'full-rim' | 'semi-rimless' | 'rimless' | 'wrap';
  framePrice: number | null;
  frameImageUrl: string | null;
  baseCurve: boolean;
  eyeSize: number | null;
  lensProductSku: string;
  source: 'frame' | 'reglaze';
  supplierGlazingRoutes: SupplierGlazingRoute[];
  brandedLensRoute: BrandedLensRoute;
  restrictions: {
    disallowedOptions: string[];
    notes: string[];
  };
}

export interface LensConfig {
  version: string;
  currency: {
    symbol: string;
    code: string;
  };
  basePrice: number;
  steps: LensStep[];
  options: Record<string, LensOptionGroup>;
}

export interface LensStep {
  id: string;
  title: string;
  description?: string;
  optionGroup: string;
  showWhen?: LensCondition;
  autoAdvance?: boolean;
}

export interface LensOptionGroup {
  title: string;
  required: boolean;
  type: 'radio' | 'checkbox' | 'prescription';
  magentoCode: string,
  options: LensOption[];
}

export interface LensOption {
  id: string;
  title: string;
  description?: string;
  price: number;
  priceOverrides?: Array<{
    when: LensCondition;
    price: number;
  }>;
  priceAdjustments?: Array<{
    when: LensCondition;
    amount: number;
  }>;
  sku?: string;
  childOptionsGroup?: string;
  color?: string;
  showWhen?: LensCondition;
  disabledWhen?: LensCondition;
  disabledReason?: string;
  magentoCode: string;
  badgeLabel?: string;
  badgePrice?: number;
  badgePricePrefix?: string;
  details?: string[];
  imageUrl?: string;
  imageKind?: 'engraving' | 'lab';
  supplierLensId?: string;
  supplierCost?: number;
  exclusive?: boolean;
}

export type FrameConditionProperty = keyof Omit<FrameContext, 'restrictions'> | 'disallowedOptions';

export interface SelectedCondition {
  type: 'selected';
  option: string;
}

export interface NotSelectedCondition {
  type: 'notSelected';
  option: string;
}

export interface FrameCondition {
  type: 'frame';
  property: FrameConditionProperty;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'notIn';
  value: unknown;
}

export interface AndCondition {
  type: 'and';
  conditions: LensCondition[];
}

export interface OrCondition {
  type: 'or';
  conditions: LensCondition[];
}

export interface NotCondition {
  type: 'not';
  condition: LensCondition;
}

export type LensCondition = SelectedCondition | NotSelectedCondition | FrameCondition | AndCondition | OrCondition | NotCondition;

export interface ComputedOption extends LensOption {
  isDisabled: boolean;
  isHidden: boolean;
  disabledReason?: string;
}

export interface PriceLineItem {
  stepId: string;
  stepTitle: string;
  optionId: string;
  optionTitle: string;
  price: number;
}

export interface VisibleSelection {
  stepId: string;
  stepTitle: string;
  optionTitle: string;
}

export interface ReviewSection {
  id: string;
  editStepId: string;
  title: string;
  values: string[];
  details: string[];
  complete: boolean;
}

export interface MagentoCustomizationEntry {
  code: string;
  value: string | string[];
}

export interface LensCustomizationDraft {
  quoteId: string | null;
  configVersion: string;
  currencyCode: string;
  termsAccepted: boolean;
  frame: FrameContext;
  lensProductSku: string;
  supplier: {
    route: SupplierGlazingRoute;
    lensId: string | null;
  } | null;
  selections: SelectionMap;
  reglazeFrameDescription: string;
  reglazeFrameAttachment?: PrescriptionAttachmentMetadata | null;
  prescription: PrescriptionState | null;
  prescriptionAttachment: PrescriptionAttachmentMetadata | null;
  displayItems: PriceLineItem[];
  displayTotal: number;
  magentoCustomizations: MagentoCustomizationEntry[];
}

export const prescriptionMethods = ['manual', 'upload', 'saved', 'later'] as const;
export type PrescriptionMethod = (typeof prescriptionMethods)[number];

export interface PrescriptionAttachmentMetadata {
  name: string;
  mimeType: string;
  size: number;
}

export interface PrescriptionState {
  method: PrescriptionMethod | '';
  uploadReference: string;
  savedReference: string;
  manual: {
    rightSphereSign: '+' | '-' | '';
    rightSphereValue: string;
    rightCylinderSign: '+' | '-' | '';
    rightCylinderValue: string;
    rightAxis: string;
    leftSphereSign: '+' | '-' | '';
    leftSphereValue: string;
    leftCylinderSign: '+' | '-' | '';
    leftCylinderValue: string;
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

export interface JourneySnapshot {
  phase: 'builder' | 'final';
  builderStepId: string | null;
  quoteId: string | null;
  frame: FrameContext;
  selections: SelectionMap;
  reglazeFrameDescription: string;
  prescription: PrescriptionState;
}

export interface BackendState {
  root?: string;
  data?: unknown;
  bridge?: unknown;
  meta?: {
    hash_data?: string;
  };
  [key: string]: unknown;
}
