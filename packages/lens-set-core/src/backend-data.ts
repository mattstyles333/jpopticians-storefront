import type { FrameContext, LensConfig, LensOption, LensOptionGroup, SupplierGlazingRoute } from './types';
import { normalizeSupplierGlazingRoute } from './types';

interface BackendAttribute {
  value: unknown;
}

interface BackendFrame {
  sku?: string;
  name?: string;
  price?: number;
  image_url?: string;
  source?: string;
  attributes?: Record<string, BackendAttribute>;
  supplier_glazing_routes?: unknown;
  supplierGlazingRoutes?: unknown;
}

interface BackendCustomOptionItem {
  sku: string;
  title: string;
  price: number;
}


interface BackendCustomOption {
  sku: string;
  title: string;
  type: string;
  isRequired: boolean;
  items: BackendCustomOptionItem[];
}

interface BackendLenses {
  sku?: string;
  customOptions: BackendCustomOption[];
}

interface ParsedBackendState {
  root?: string;
  currencyCode?: string;
  currencySymbol?: string;
  submitUrl?: string;
  formKey?: string;
  frame?: BackendFrame;
  lenses?: BackendLenses;
  supplierGlazingRoutes?: unknown;
  meta?: {
    hashData?: string;
  };
  firstLoad?: boolean;
  lensesQuoteItemId?: null | number;
}

const appOwnedMagentoCodes = new Set([
  'glazing_route',
  'luxottica_vision_type',
  'luxottica_lens_option',
  'luxottica_lens_colour',
  'maui_jim_vision_type',
  'maui_jim_lens_material',
  'maui_jim_lens_colour',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number`);
  }
  return parsed;
}

function optionalBoolean(value: unknown, field: string) : boolean | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    if (false !== value && true !== value) {
        throw new Error(`${field} must be a boolean`);
    }
    return value;
}

function parseRequiredFlag(value: unknown, field: string): boolean {
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === undefined || value === null) {
    return false;
  }
  throw new Error(`${field} must be a boolean flag`);
}

function parseAttributes(value: unknown): Record<string, BackendAttribute> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error('frame.attributes must be an object');
  }
  const attributes: Record<string, BackendAttribute> = {};
  for (const [code, attribute] of Object.entries(value)) {
    if (!isRecord(attribute) || !('value' in attribute)) {
      throw new Error(`frame.attributes.${code} must contain a value`);
    }
    attributes[code] = { value: attribute.value };
  }
  return attributes;
}

function parseCustomOptionItem(value: unknown, optionIndex: number, itemIndex: number): BackendCustomOptionItem {
  if (!isRecord(value)) {
    throw new Error(`lenses.custom_options[${optionIndex}].items[${itemIndex}] must be an object`);
  }
  const sku = optionalString(value.sku, `lenses.custom_options[${optionIndex}].items[${itemIndex}].sku`);
  const title = optionalString(value.title, `lenses.custom_options[${optionIndex}].items[${itemIndex}].title`);
  const price = optionalNumber(value.price, `lenses.custom_options[${optionIndex}].items[${itemIndex}].price`);
  if (!sku || !title || price === undefined || price < 0) {
    throw new Error(`lenses.custom_options[${optionIndex}].items[${itemIndex}] is incomplete`);
  }
  return { sku, title, price };
}

function parseCustomOption(value: unknown, index: number): BackendCustomOption {
  if (!isRecord(value)) {
    throw new Error(`lenses.custom_options[${index}] must be an object`);
  }
  const sku = optionalString(value.sku, `lenses.custom_options[${index}].sku`);
  const title = optionalString(value.title, `lenses.custom_options[${index}].title`);
  const type = optionalString(value.type, `lenses.custom_options[${index}].type`);
  if (!sku || !title || !type) {
    throw new Error(`lenses.custom_options[${index}] is incomplete`);
  }
  if (value.items !== undefined && !Array.isArray(value.items)) {
    throw new Error(`lenses.custom_options[${index}].items must be an array`);
  }
  return {
    sku,
    title,
    type,
    isRequired: parseRequiredFlag(value.is_require, `lenses.custom_options[${index}].is_require`),
    items: (value.items ?? []).map((item, itemIndex) => parseCustomOptionItem(item, index, itemIndex)),
  };
}

function parseBackendState(input: unknown): ParsedBackendState {
  if (input === undefined || input === null) {
    return {};
  }
  if (!isRecord(input)) {
    throw new Error('Backend data must be an object');
  }

  let frame: BackendFrame | undefined;
  if (input.frame !== undefined && input.frame !== null) {
    if (!isRecord(input.frame)) {
      throw new Error('frame must be an object');
    }
    frame = {
      sku: optionalString(input.frame.sku, 'frame.sku'),
      name: optionalString(input.frame.name, 'frame.name'),
      price: optionalNumber(input.frame.price, 'frame.price'),
      image_url: optionalString(input.frame.image_url, 'frame.image_url'),
      source: optionalString(input.frame.source, 'frame.source'),
      attributes: parseAttributes(input.frame.attributes),
      supplier_glazing_routes: input.frame.supplier_glazing_routes,
      supplierGlazingRoutes: input.frame.supplierGlazingRoutes,
    };
  }

  let lenses: BackendLenses | undefined;
  if (input.lenses !== undefined && input.lenses !== null) {
    if (!isRecord(input.lenses)) {
      throw new Error('lenses must be an object');
    }
    if (input.lenses.custom_options !== undefined && !Array.isArray(input.lenses.custom_options)) {
      throw new Error('lenses.custom_options must be an array');
    }
    lenses = {
      sku: optionalString(input.lenses.sku, 'lenses.sku'),
      customOptions: (input.lenses.custom_options ?? []).map(parseCustomOption),
    };
  }

  let meta: ParsedBackendState['meta'];
  if (input.meta !== undefined && input.meta !== null) {
    if (!isRecord(input.meta)) {
      throw new Error('meta must be an object');
    }
    meta = { hashData: optionalString(input.meta.hash_data, 'meta.hash_data') };
  }

  return {
    root: optionalString(input.root, 'root'),
    currencyCode: optionalString(input.currency_code, 'currency_code'),
    currencySymbol: optionalString(input.currency_symbol, 'currency_symbol'),
    submitUrl: optionalString(input.submit_url, 'submit_url'),
    formKey: optionalString(input.form_key, 'form_key'),
    frame,
    lenses,
    supplierGlazingRoutes: input.supplier_glazing_routes,
    meta,
    firstLoad: optionalBoolean(input.first_load, 'first_load'),
    lensesQuoteItemId: optionalNumber(input.lenses_quote_item_id, 'lenses_quote_item_id')
  };
}

function cloneRawData(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }
}

export class BackendDataStore {
  private data: ParsedBackendState = {};
  private rawData: Record<string, unknown> = {};

  constructor(payload: unknown = {}) {
    this.init(payload);
  }

  init(payload: unknown): void {
    const parsed = parseBackendState(payload);
    this.data = parsed;
    this.rawData = cloneRawData(payload);
  }

  getRoot(): string {
    return this.data.root ?? '#app';
  }

  getIsFirstLoad() : boolean {
      return this.data.firstLoad ?? false;
  }

  getHashData(): string | null {
    return this.data.meta?.hashData ?? null;
  }

  getCurrencyCode(): string | null {
    return this.data.currencyCode ?? null;
  }

  getCurrencySymbol(): string | null {
    return this.data.currencySymbol ?? null;
  }

  frameAttributeExists(code: string): boolean {
    return this.data.frame?.attributes?.[code] !== undefined;
  }

  getFrameAttributeValue(code: string): unknown {
    return this.data.frame?.attributes?.[code]?.value ?? null;
  }

  getFrameSku(): string {
    return this.data.frame?.sku ?? 'FRAME-DEMO-001';
  }

  getFrameName(): string {
    return this.data.frame?.name ?? 'Demo Frame';
  }

  getFramePrice(): number | null {
    return this.data.frame?.price ?? null;
  }

  getFrameTypeCode(): FrameContext['frameType'] {
    const rawType = String(this.getFrameAttributeValue('a1_frame_type') ?? '').trim().toLowerCase();
    const map: Record<string, FrameContext['frameType']> = {
      'full rimmed': 'full-rim',
      'full-rim': 'full-rim',
      'semi rimless': 'semi-rimless',
      'semi-rimless': 'semi-rimless',
      rimless: 'rimless',
      wrap: 'wrap',
      'wrap / sports': 'wrap',
    };
    return map[rawType] ?? 'full-rim';
  }

  getFrameImageUrl(): string | null {
    return this.data.frame?.image_url ?? null;
  }

  getLensesSku(): string {
    return this.data.lenses?.sku ?? 'LENS-GENERIC-001';
  }

  getLensesQuoteItemId(): number | null {
      return this.data.lensesQuoteItemId ?? null;
  }

  getSource(): FrameContext['source'] {
    return this.data.frame?.source === 'reglaze' ? 'reglaze' : 'frame';
  }

  getSupplierGlazingRoutes(): SupplierGlazingRoute[] {
    const rawRoutes = this.data.frame?.supplier_glazing_routes
      ?? this.data.frame?.supplierGlazingRoutes
      ?? this.data.supplierGlazingRoutes
      ?? [];
    const routes = Array.isArray(rawRoutes) ? rawRoutes : String(rawRoutes).split(',');
    return Array.from(new Set(routes
      .map((route) => normalizeSupplierGlazingRoute(route))
      .filter((route): route is SupplierGlazingRoute => route !== null)));
  }

  getSubmitUrl(): string | null {
    return this.data.submitUrl ?? null;
  }

  getFormKey(): string | null {
    if (this.data.formKey) {
      return this.data.formKey;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const magentoWindow = window as Window & { FORM_KEY?: string; hyva?: { getFormKey(): string } };
    return magentoWindow.FORM_KEY ?? magentoWindow.hyva?.getFormKey() ?? null;
  }

  getData(): Record<string, unknown> {
    return cloneRawData(this.rawData);
  }

  mergeBackendLensConfig(config: LensConfig): LensConfig {
    const merged = structuredClone(config) as LensConfig;
    merged.currency.code = this.data.currencyCode ?? merged.currency.code;
    merged.currency.symbol = this.data.currencySymbol ?? merged.currency.symbol;

    for (const magentoOption of this.data.lenses?.customOptions ?? []) {
      let appOption: LensOptionGroup | null = null;
      for (const candidateOption of Object.values(merged.options)) {
        if (magentoOption.sku === candidateOption.magentoCode) {
          appOption = candidateOption;
          break;
        }
      }
      if (!appOption) {
        throw new Error(`Option: ${magentoOption.sku} - not found in app config`);
      }
      if (appOption.type === 'radio' && magentoOption.type !== 'drop_down') {
        throw new Error(`Option: ${magentoOption.sku} - option type mismatch.`);
      }
      if (appOption.type === 'checkbox' && magentoOption.type !== 'checkbox') {
        throw new Error(`Option: ${magentoOption.sku} - option type mismatch.`);
      }

      const appOwnsOptionValues = appOwnedMagentoCodes.has(appOption.magentoCode);
      if (!appOwnsOptionValues) {
        appOption.title = magentoOption.title;
      }

      for (const magentoSelection of magentoOption.items) {
        const glazingRoute = appOption.magentoCode === 'glazing_route' ? normalizeSupplierGlazingRoute(magentoSelection.sku) : null;
        const appSelection = appOption.options.find((candidateSelection: LensOption) =>
          magentoSelection.sku === candidateSelection.id || glazingRoute === candidateSelection.id
        );
        if (!appSelection && glazingRoute) {
          continue;
        }
        if (!appSelection) {
          throw new Error(`Option's (${magentoOption.sku}) selection: ${magentoSelection.sku} - not found in app config`);
        }
        if (!appOwnsOptionValues) {
          appSelection.price = magentoSelection.price;
          appSelection.title = magentoSelection.title;
        }
      }
    }
    return merged;
  }
}

export function createBackendData(payload: unknown = {}): BackendDataStore {
  return new BackendDataStore(payload);
}

// Kept as a demo/test context. Runtime application mounts create their own store.
export const backendData = createBackendData();
