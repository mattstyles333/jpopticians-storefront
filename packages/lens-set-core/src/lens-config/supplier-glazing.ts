import type { LensCondition, LensOption, SelectionMap, SupplierGlazingRoute } from '../types';
import { allOf, selectedAny } from './helpers';

export interface SupplierGlazingRouteConfig {
  id: SupplierGlazingRoute;
  title: string;
  description: string;
  startingPrice: number;
  requiresPrescription: boolean;
  prescriptionWhen: LensCondition;
  readingAddOptions: string[];
  details: string[];
  imageUrl?: string;
}

type LuxotticaRoute = 'rayban-sun' | 'oakley-sun' | 'rayban-optical' | 'oakley-optical';
type LuxotticaVision = 'single-vision' | 'varifocal';
type LuxotticaFinish = 'clear' | 'tint' | 'polarised' | 'transitions-gen-s';

interface LuxotticaLensDefinition {
  route: LuxotticaRoute;
  vision: LuxotticaVision;
  finish: LuxotticaFinish;
  price: number;
  supplierCost: number;
}

export const luxotticaRoutes: LuxotticaRoute[] = ['rayban-sun', 'oakley-sun', 'rayban-optical', 'oakley-optical'];
export const luxotticaSunRoutes: LuxotticaRoute[] = ['rayban-sun', 'oakley-sun'];
export const luxotticaVisionTypeOptions: LensOption[] = [
  {
    id: 'luxottica-distance',
    title: 'Distance',
    description: 'For driving, walking around, and everyday distance vision.',
    price: 0,
    magentoCode: 'luxottica_vision_type',
  },
  {
    id: 'luxottica-reading',
    title: 'Reading',
    description: 'For close-up reading and near tasks in official branded lenses.',
    price: 0,
    magentoCode: 'luxottica_vision_type',
  },
  {
    id: 'luxottica-varifocal',
    title: 'Varifocal',
    description: 'Official branded varifocal lenses for distance and reading in one pair.',
    price: 0,
    magentoCode: 'luxottica_vision_type',
  },
];

const luxotticaRouteNames: Record<LuxotticaRoute, string> = {
  'rayban-sun': 'Ray-Ban sunglasses',
  'oakley-sun': 'Oakley sunglasses',
  'rayban-optical': 'Ray-Ban optical',
  'oakley-optical': 'Oakley optical',
};

const luxotticaFinishTitles: Record<LuxotticaFinish, string> = {
  clear: 'Clear',
  tint: 'Tinted',
  polarised: 'Polarised',
  'transitions-gen-s': 'Transitions Gen S',
};

const luxotticaLensDefinitions: LuxotticaLensDefinition[] = [
  { route: 'rayban-sun', vision: 'single-vision', finish: 'tint', price: 159, supplierCost: 53 },
  { route: 'rayban-sun', vision: 'varifocal', finish: 'tint', price: 259, supplierCost: 86.33 },
  { route: 'oakley-sun', vision: 'single-vision', finish: 'tint', price: 230, supplierCost: 76.67 },
  { route: 'oakley-sun', vision: 'single-vision', finish: 'polarised', price: 280, supplierCost: 93.33 },
  { route: 'oakley-sun', vision: 'varifocal', finish: 'tint', price: 400, supplierCost: 133.33 },
  { route: 'oakley-sun', vision: 'varifocal', finish: 'polarised', price: 450, supplierCost: 150 },
  { route: 'rayban-optical', vision: 'single-vision', finish: 'clear', price: 99, supplierCost: 24.75 },
  { route: 'rayban-optical', vision: 'single-vision', finish: 'transitions-gen-s', price: 199, supplierCost: 49.75 },
  { route: 'rayban-optical', vision: 'varifocal', finish: 'clear', price: 249, supplierCost: 76.62 },
  { route: 'rayban-optical', vision: 'varifocal', finish: 'transitions-gen-s', price: 389, supplierCost: 132.76 },
  { route: 'oakley-optical', vision: 'single-vision', finish: 'clear', price: 99, supplierCost: 24.75 },
  { route: 'oakley-optical', vision: 'single-vision', finish: 'transitions-gen-s', price: 199, supplierCost: 68.75 },
  { route: 'oakley-optical', vision: 'varifocal', finish: 'clear', price: 249, supplierCost: 76.62 },
  { route: 'oakley-optical', vision: 'varifocal', finish: 'transitions-gen-s', price: 349, supplierCost: 120.53 },
];

export const luxotticaSunLensOptionIds = luxotticaLensDefinitions
  .filter((definition) => luxotticaSunRoutes.includes(definition.route))
  .map((definition) => `${definition.route}-${definition.vision}-${definition.finish}`);

function luxotticaLensId(definition: LuxotticaLensDefinition): string {
  return `${definition.route}-${definition.vision}-${definition.finish}`;
}

function luxotticaVisionCondition(vision: LuxotticaVision): LensCondition {
  return vision === 'single-vision' ? selectedAny('luxottica-distance', 'luxottica-reading') : { type: 'selected', option: 'luxottica-varifocal' };
}

export const luxotticaLensOptions: LensOption[] = luxotticaLensDefinitions.map((definition) => {
  const supplierLensId = luxotticaLensId(definition);
  const routeName = luxotticaRouteNames[definition.route];
  const finishTitle = definition.route === 'rayban-sun' && definition.finish === 'tint'
    ? 'Sun'
    : luxotticaFinishTitles[definition.finish];
  const visionTitle = definition.vision === 'single-vision' ? 'lenses' : 'varifocal';

  return {
    id: supplierLensId,
    title: `${finishTitle} ${visionTitle}`,
    description: `${routeName} ${visionTitle}. Includes the supplier default coating and sensible lens index for this branded option.`,
    price: definition.price,
    magentoCode: 'luxottica_lens_option',
    supplierLensId,
    supplierCost: definition.supplierCost,
    showWhen: allOf({ type: 'selected', option: definition.route }, luxotticaVisionCondition(definition.vision)),
  };
});

export const luxotticaLensColourOptions: LensOption[] = [
  {
    id: 'rayban-sun-colour-g15-green',
    title: 'G-15 Green',
    description: "Ray-Ban's signature deep green sun tint.",
    price: 0,
    color: '#3F5132',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-b15-brown',
    title: 'B-15 Brown',
    description: 'The classic warm brown Ray-Ban sun tint.',
    price: 0,
    color: '#6B4423',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-grey',
    title: 'Grey',
    description: 'A neutral sunglass colour that keeps colours looking natural in bright light.',
    price: 0,
    color: '#4A4A4A',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-brown',
    title: 'Brown',
    description: 'A standard brown Ray-Ban sun tint.',
    price: 0,
    color: '#8B4513',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-polarised-grey',
    title: 'Polarised Grey',
    description: 'Neutral grey with Ray-Ban polarisation to reduce glare.',
    price: 50,
    supplierCost: 16.67,
    color: '#3D3D3D',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-polarised-brown',
    title: 'Polarised Brown',
    description: 'Warm brown with Ray-Ban polarisation to reduce glare.',
    price: 50,
    supplierCost: 16.67,
    color: '#5C3A1E',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-polarised-g15',
    title: 'Polarised G-15',
    description: 'The signature G-15 green with Ray-Ban polarisation.',
    price: 50,
    supplierCost: 16.67,
    color: '#2E3D24',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'rayban-sun-colour-polarised-b15',
    title: 'Polarised B-15',
    description: 'The classic B-15 brown with Ray-Ban polarisation.',
    price: 50,
    supplierCost: 16.67,
    color: '#4D3016',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'rayban-sun' },
  },
  {
    id: 'oakley-sun-colour-grey',
    title: 'Grey',
    description: 'A neutral solid Oakley sun tint.',
    price: 0,
    color: '#4A4A4A',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-bronze',
    title: 'Bronze',
    description: 'A warm solid Oakley sun tint for enhanced contrast.',
    price: 0,
    color: '#8A5C2E',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-black-iridium',
    title: 'Black Iridium',
    description: 'A dark, reflective Oakley Iridium finish.',
    price: 0,
    color: 'linear-gradient(135deg, #111827, #4B5563, #D1D5DB)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-sapphire-iridium',
    title: 'Sapphire Iridium',
    description: 'A vivid blue reflective Oakley Iridium finish.',
    price: 0,
    color: 'linear-gradient(135deg, #0B3D91, #0EA5E9, #BAE6FD)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-jade-prizm',
    title: 'Jade PRIZM',
    description: 'A green Oakley PRIZM finish with a bright reflective shift.',
    price: 0,
    color: 'linear-gradient(135deg, #064E3B, #10B981, #A7F3D0)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-tungsten-prizm',
    title: 'Tungsten PRIZM',
    description: 'A warm amber Oakley PRIZM finish.',
    price: 0,
    color: 'linear-gradient(135deg, #7C3F12, #B7791F, #FBBF24)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-vr50-prizm',
    title: 'VR50 PRIZM',
    description: 'An earthy, high-contrast Oakley PRIZM finish.',
    price: 0,
    color: 'linear-gradient(135deg, #3B2F15, #9A7B3C, #D4C080)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
  {
    id: 'oakley-sun-colour-fire-iridium',
    title: 'Fire Iridium',
    description: 'A fiery orange reflective Oakley Iridium finish.',
    price: 0,
    color: 'linear-gradient(135deg, #6B2100, #D96C1A, #FFB088)',
    magentoCode: 'luxottica_lens_colour',
    showWhen: { type: 'selected', option: 'oakley-sun' },
  },
];

const rayBanPolarisedColourIds = new Set(
  luxotticaLensColourOptions
    .filter((option) => option.id.startsWith('rayban-sun-colour-polarised-'))
    .map((option) => option.id)
);

const luxotticaLensIdsByRoute = new Map<LuxotticaRoute, string[]>(
  luxotticaRoutes.map((route) => [route, luxotticaLensOptions.filter((option) => option.id.startsWith(route)).map((option) => option.id)])
);

const supplierLensIdEntries: [string, string][] = [
  ...luxotticaLensOptions.flatMap((option): [string, string][] => (option.supplierLensId ? [[option.id, option.supplierLensId]] : [])),
  ['maui-brilliant-single-vision', 'maui-brilliant-single-vision'],
  ['maui-evolution-single-vision', 'maui-evolution-single-vision'],
  ['maui-polycarbonate-single-vision', 'maui-polycarbonate-single-vision'],
  ['maui-brilliant-varifocal', 'maui-brilliant-varifocal'],
  ['maui-evolution-varifocal', 'maui-evolution-varifocal'],
  ['maui-polycarbonate-varifocal', 'maui-polycarbonate-varifocal'],
];

const supplierLensIdByOptionId = new Map<string, string>(supplierLensIdEntries);
const supplierLensRouteByOptionId = new Map<string, SupplierGlazingRoute>([
  ...luxotticaLensOptions.map((option): [string, SupplierGlazingRoute] => [option.id, option.id.split('-').slice(0, 2).join('-') as SupplierGlazingRoute]),
  ['maui-brilliant-single-vision', 'maui-jim-sun'],
  ['maui-evolution-single-vision', 'maui-jim-sun'],
  ['maui-polycarbonate-single-vision', 'maui-jim-sun'],
  ['maui-brilliant-varifocal', 'maui-jim-sun'],
  ['maui-evolution-varifocal', 'maui-jim-sun'],
  ['maui-polycarbonate-varifocal', 'maui-jim-sun'],
]);

function luxotticaPrescriptionWhen(route: LuxotticaRoute): LensCondition {
  return allOf({ type: 'selected', option: route }, selectedAny(...(luxotticaLensIdsByRoute.get(route) ?? [])));
}

function luxotticaStartingPrice(route: LuxotticaRoute): number {
  return Math.min(...luxotticaLensOptions.filter((option) => option.id.startsWith(route)).map((option) => option.price));
}

function luxotticaRouteConfig(
  route: LuxotticaRoute,
  title: string,
  description: string,
  included: string,
  imageUrl?: string
): SupplierGlazingRouteConfig {
  return {
    id: route,
    title,
    description,
    startingPrice: luxotticaStartingPrice(route),
    requiresPrescription: true,
    prescriptionWhen: luxotticaPrescriptionWhen(route),
    readingAddOptions: ['luxottica-reading', 'luxottica-varifocal'],
    details: ['Official branded lens engraving', included, 'Fixed supplier price with no coating or index selector'],
    imageUrl,
  };
}

export const supplierGlazingRouteConfigs: SupplierGlazingRouteConfig[] = [
  {
    id: 'maui-jim-sun',
    title: 'Official Maui Jim sun lenses',
    description:
      'Supplier-glazed Maui Jim prescription sun lenses with official brand lens etching. Usually a longer lead time and a simpler option set.',
    startingPrice: 238,
    requiresPrescription: true,
    prescriptionWhen: allOf({ type: 'selected', option: 'maui-jim-sun' }, selectedAny('maui-jim-distance', 'maui-jim-reading', 'maui-jim-varifocal')),
    readingAddOptions: ['maui-jim-varifocal', 'maui-jim-reading'],
    details: ['Official Maui Jim lens etching', 'Supplier prescription sun lens materials', 'Simplified supplier option set'],
    imageUrl: '/supplier-glazing/mauijim-public-existing-logo-closeup.webp',
  },
  luxotticaRouteConfig(
    'rayban-sun',
    'Official Ray-Ban sun lenses',
    'Official Ray-Ban prescription sun lenses with branded engraving and a simplified supplier menu.',
    'Tinted or polarised sun lenses only',
    '/supplier-glazing/rayban-sun-logo-closeup.webp'
  ),
  luxotticaRouteConfig(
    'oakley-sun',
    'Official Oakley sun lenses',
    'Official Oakley prescription sun lenses with branded engraving and a simplified supplier menu.',
    'Tinted or polarised sun lenses only',
    '/supplier-glazing/oakley-sun-prizm-close-existing.webp'
  ),
  luxotticaRouteConfig(
    'rayban-optical',
    'Official Ray-Ban optical lenses',
    'Official Ray-Ban prescription optical lenses with branded engraving and a simplified supplier menu.',
    'Clear or Transitions Gen S lenses only',
    '/supplier-glazing/rayban-optical-logo-closeup.webp'
  ),
  luxotticaRouteConfig(
    'oakley-optical',
    'Official Oakley optical lenses',
    'Official Oakley prescription optical lenses with branded engraving and a simplified supplier menu.',
    'Clear or Transitions Gen S lenses only'
  ),
];

export const implementedSupplierRoutes: SupplierGlazingRoute[] = supplierGlazingRouteConfigs.map((config) => config.id);

export const supplierGlazingRouteOptions: LensOption[] = supplierGlazingRouteConfigs.map((config) => ({
  id: config.id,
  title: config.title,
  description: config.description,
  price: 0,
  magentoCode: 'glazing_route',
  badgePrice: config.startingPrice,
  badgePricePrefix: 'From',
  details: config.details,
  imageKind: 'engraving',
  imageUrl: config.imageUrl,
  showWhen: { type: 'frame', property: 'supplierGlazingRoutes', operator: 'in', value: [config.id] },
}));

export const supplierGlazingPrescriptionSelected: LensCondition = {
  type: 'or',
  conditions: supplierGlazingRouteConfigs.filter((config) => config.requiresPrescription).map((config) => config.prescriptionWhen),
};

function selectionValues(selections: SelectionMap): string[] {
  return Object.values(selections).flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
}

export function getSelectedSupplierGlazingRouteConfig(selections: SelectionMap): SupplierGlazingRouteConfig | null {
  const route = Array.isArray(selections['glazing-route']) ? selections['glazing-route'][0] : selections['glazing-route'];
  return supplierGlazingRouteConfigs.find((config) => config.id === route) ?? null;
}

export function supplierGlazingRequiresPrescription(selections: SelectionMap): boolean {
  return getSelectedSupplierGlazingRouteConfig(selections)?.requiresPrescription ?? false;
}

export function supplierGlazingNeedsReadingAdd(selections: SelectionMap): boolean {
  const config = getSelectedSupplierGlazingRouteConfig(selections);
  if (!config) {
    return false;
  }

  const selectedOptions = new Set(selectionValues(selections));
  return config.readingAddOptions.some((option) => selectedOptions.has(option));
}

export function getSelectedSupplierLensId(selections: SelectionMap): string | null {
  const route = getSelectedSupplierGlazingRouteConfig(selections)?.id;
  if (!route) {
    return null;
  }

  for (const value of selectionValues(selections)) {
    if (supplierLensRouteByOptionId.get(value) !== route) {
      continue;
    }

    const supplierLensId = supplierLensIdByOptionId.get(value);
    if (supplierLensId) {
      if (supplierLensId.startsWith('rayban-sun-') && supplierLensId.endsWith('-tint')) {
        const colour = selections['luxottica-lens-colour'];
        const colourId = Array.isArray(colour) ? colour[0] : colour;
        if (colourId && rayBanPolarisedColourIds.has(colourId)) {
          return supplierLensId.replace(/-tint$/, '-polarised');
        }
      }
      return supplierLensId;
    }
  }

  return null;
}
