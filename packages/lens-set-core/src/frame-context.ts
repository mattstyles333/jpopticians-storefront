import type { FrameContext, PrescriptionState, SupplierGlazingRoute } from './types';
import { normalizeSupplierGlazingRoute } from './types';
import { backendData, type BackendDataStore } from './backend-data';

function parseSupplierGlazingRoutes(value: string | null): SupplierGlazingRoute[] {
  if (!value) {
    return [];
  }

  // The backend lists only official supplier routes; 'spex4less' is the default in-app route.
  return Array.from(new Set(value
    .split(',')
    .map((route) => normalizeSupplierGlazingRoute(route))
    .filter((route): route is SupplierGlazingRoute => route !== null)));
}

export const defaultPrescriptionState: PrescriptionState = {
  method: 'manual',
  uploadReference: '',
  savedReference: '',
  manual: {
    rightSphereSign: '',
    rightSphereValue: '',
    rightCylinderSign: '',
    rightCylinderValue: '',
    rightAxis: '',
    leftSphereSign: '',
    leftSphereValue: '',
    leftCylinderSign: '',
    leftCylinderValue: '',
    leftAxis: '',
    rightAddPower: '',
    leftAddPower: '',
    rightIntermediateAdd: '',
    leftIntermediateAdd: '',
    rightPrism: '',
    leftPrism: '',
    pd: '64.0',
  },
};

function parseBackendBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

export function getDefaultFrameContext(backend: BackendDataStore = backendData): FrameContext {
  if (typeof window === 'undefined') {
    return {
      frameSku: 'FRAME-DEMO-001',
      frameName: 'Demo Frame',
      frameType: 'full-rim',
      framePrice: null,
      frameImageUrl: null,
      baseCurve: false,
      eyeSize: null,
      lensProductSku: 'LENS-GENERIC-001',
      source: 'frame',
      supplierGlazingRoutes: [],
      brandedLensRoute: 'standard',
      restrictions: {
        disallowedOptions: [],
        notes: [],
      },
    };
  }
  //todo : just for debugging, to be removed later
  console.log('[lib/frame-context.ts]: getting frame-context data from backend');

  const params = new URLSearchParams(window.location.search);
  const useQuery = params.has('useQuery');
  const frameTypeParam = useQuery ? params.get('frameType') : backend.getFrameTypeCode();
  const frameType =
    frameTypeParam === 'rimless' || frameTypeParam === 'semi-rimless' || frameTypeParam === 'wrap' ? frameTypeParam : 'full-rim';
  const framePriceValue = useQuery ? params.get('framePrice') : null;
  const framePrice = useQuery ? (framePriceValue ? Number(framePriceValue) : null) : backend.getFramePrice();
  const eyeSizeValue = params.get('eyeSize');
  const eyeSize = useQuery && eyeSizeValue ? Number(eyeSizeValue) : null;
  const baseCurve = useQuery
    ? ['1', 'true', 'yes'].includes((params.get('baseCurve') ?? '').toLowerCase())
    : parseBackendBoolean(backend.getFrameAttributeValue('b2_base_curve'));
  const sourceValue = useQuery ? params.get('journey') : backend.getSource();
  const source = sourceValue === 'reglaze' ? 'reglaze' : 'frame';
  const supplierGlazingRoutes = useQuery
    ? parseSupplierGlazingRoutes(params.get('supplierGlazingRoutes') ?? params.get('supplierGlazing'))
    : backend.getSupplierGlazingRoutes();
  const brandedLensRoute = supplierGlazingRoutes[0] ?? 'standard';

  return {
    frameSku: useQuery ? (params.get('frameSku') ?? 'FRAME-DEMO-001') : backend.getFrameSku(),
    frameName: useQuery ? (params.get('frameName') ?? 'Demo Frame') : backend.getFrameName(),
    frameType,
    framePrice: Number.isFinite(framePrice) && (framePrice ?? -1) >= 0 ? framePrice : null,
    frameImageUrl: useQuery ? null : backend.getFrameImageUrl(),
    baseCurve,
    eyeSize: Number.isFinite(eyeSize) ? eyeSize : null,
    lensProductSku: useQuery ? (params.get('lensSku') ?? 'LENS-GENERIC-001') : backend.getLensesSku(),
    source,
    supplierGlazingRoutes,
    brandedLensRoute,
    restrictions: {
      disallowedOptions: [],
      notes:
        source === 'reglaze'
          ? ['Reglaze journey loaded for this frame.']
        : frameType === 'rimless'
            ? ['Rimless frame selected. Some lens options may be unavailable.']
            : [],
    },
  };
}
