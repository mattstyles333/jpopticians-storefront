import type { LensCondition } from '../types';
import { implementedSupplierRoutes } from './supplier-glazing';
import { anyOf, notSelectedAny, selectedAny } from './helpers';

export const configuredSupplierRouteAvailable: LensCondition = {
  type: 'frame',
  property: 'supplierGlazingRoutes',
  operator: 'in',
  value: implementedSupplierRoutes,
};

export const standardGlazingSelected = notSelectedAny(...implementedSupplierRoutes);

export const anyUseCaseSelected: LensCondition = {
  type: 'or',
  conditions: [
    { type: 'selected', option: 'distance' },
    { type: 'selected', option: 'reading' },
    { type: 'selected', option: 'intermediate' },
    { type: 'selected', option: 'bifocal' },
    { type: 'selected', option: 'varifocal' },
    { type: 'selected', option: 'occupational' },
    { type: 'selected', option: 'frame-only' },
    { type: 'selected', option: 'fashion-lenses' },
  ],
};

export const zeissDesignSelected = selectedAny('zeiss-varifocal', 'zeiss-occupational');
export const essilorDesignSelected = selectedAny('essilor-varifocal', 'essilor-occupational');
export const bifocalSelected = selectedAny('bifocal', 'bifocal-d28', 'bifocal-r28', 'bifocal-executive');
export const baseCurveFrame: LensCondition = { type: 'frame', property: 'baseCurve', operator: '==', value: true };
export const rimlessFrame: LensCondition = { type: 'frame', property: 'frameType', operator: '==', value: 'rimless' };
export const eyeSizeBlocksVarifocal: LensCondition = anyOf(
  { type: 'frame', property: 'eyeSize', operator: '<', value: 27 },
  { type: 'frame', property: 'eyeSize', operator: '>', value: 60 }
);
