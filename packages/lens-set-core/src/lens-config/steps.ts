import type { LensConfig } from '../types';
import { allOf, notSelectedAny, selectedAny } from './helpers';
import { mauiJimMaterialOptionIds } from './groups/maui-jim-sun';
import { luxotticaRoutes, luxotticaSunLensOptionIds, supplierGlazingPrescriptionSelected } from './supplier-glazing';
import {
  anyUseCaseSelected,
  configuredSupplierRouteAvailable,
  standardGlazingSelected,
} from './conditions';

const prescriptionRequired = {
  type: 'or' as const,
  conditions: [
    allOf(standardGlazingSelected, notSelectedAny('frame-only', 'fashion-lenses')),
    supplierGlazingPrescriptionSelected,
  ],
};

export const steps: LensConfig['steps'] = [
  {
    id: 'glazing-route',
    title: 'Lens glazing',
    description: 'Choose official supplier lenses or Spex4Less glazing for this frame.',
    optionGroup: 'glazing-route',
    autoAdvance: false,
    showWhen: configuredSupplierRouteAvailable,
  },
  {
    id: 'frame-type',
    title: 'Frame type',
    description: 'Tell us what kind of frame these lenses are for.',
    optionGroup: 'frame-type',
    autoAdvance: false,
    showWhen: { type: 'frame', property: 'source', operator: '==', value: 'reglaze' },
  },
  {
    id: 'use-case',
    title: 'Lens type',
    description: 'Choose what these glasses should help you see.',
    optionGroup: 'use-case',
    showWhen: standardGlazingSelected,
  },
  {
    id: 'lens-design',
    title: 'Lens level',
    description: 'Choose the specific design or quality level.',
    optionGroup: 'lens-design',
    showWhen: allOf(standardGlazingSelected, anyUseCaseSelected, notSelectedAny('frame-only', 'fashion-lenses')),
  },
  {
    id: 'luxottica-vision-type',
    title: 'Branded lens type',
    description: 'Choose distance, reading, or varifocal official Ray-Ban or Oakley lenses.',
    optionGroup: 'luxottica-vision-type',
    showWhen: selectedAny(...luxotticaRoutes),
  },
  {
    id: 'luxottica-lens-option',
    title: 'Branded lens option',
    description: 'Choose the fixed official branded lens option for this frame.',
    optionGroup: 'luxottica-lens-option',
    autoAdvance: false,
    showWhen: allOf(selectedAny(...luxotticaRoutes), selectedAny('luxottica-distance', 'luxottica-reading', 'luxottica-varifocal')),
  },
  {
    id: 'luxottica-lens-colour',
    title: 'Branded lens colour',
    description: 'Choose the official sunglass tint or finish. Ray-Ban polarised options are selected here.',
    optionGroup: 'luxottica-lens-colour',
    showWhen: selectedAny(...luxotticaSunLensOptionIds),
  },
  {
    id: 'maui-jim-vision-type',
    title: 'Maui Jim lens type',
    description: 'Choose distance, reading, or varifocal official Maui Jim sun lenses.',
    optionGroup: 'maui-jim-vision-type',
    showWhen: { type: 'selected', option: 'maui-jim-sun' },
  },
  {
    id: 'maui-jim-lens-material',
    title: 'Maui Jim lens material',
    description: 'Choose the official Maui Jim prescription sun lens material.',
    optionGroup: 'maui-jim-lens-material',
    autoAdvance: false,
    showWhen: allOf({ type: 'selected', option: 'maui-jim-sun' }, selectedAny('maui-jim-distance', 'maui-jim-reading', 'maui-jim-varifocal')),
  },
  {
    id: 'maui-jim-lens-colour',
    title: 'Maui Jim lens colour',
    description: 'Choose an official Maui Jim tint and mirror treatment for the selected lens material.',
    optionGroup: 'maui-jim-lens-colour',
    showWhen: allOf({ type: 'selected', option: 'maui-jim-sun' }, selectedAny(...mauiJimMaterialOptionIds)),
  },
  {
    id: 'prism',
    title: 'Prism',
    description: 'Tell us whether the prescription includes prism values.',
    optionGroup: 'prism',
    showWhen: prescriptionRequired,
  },
  {
    id: 'prescription',
    title: 'Prescription',
    description: 'Enter or attach the prescription details.',
    optionGroup: 'prescription',
    showWhen: prescriptionRequired,
  },
  {
    id: 'tint',
    title: 'Tint',
    description: 'Choose the tint behaviour and any colour finish.',
    optionGroup: 'tint',
    showWhen: allOf(standardGlazingSelected, notSelectedAny('frame-only')),
  },
  {
    id: 'package',
    title: 'Package',
    description: 'Choose the package or build your own.',
    optionGroup: 'package',
    showWhen: allOf(standardGlazingSelected, notSelectedAny('frame-only')),
  },
  {
    id: 'custom-index',
    title: 'Lens index',
    description: 'Choose the lens thickness.',
    optionGroup: 'custom-index',
    showWhen: allOf(standardGlazingSelected, { type: 'selected', option: 'custom-package' }),
  },
  {
    id: 'custom-coatings',
    title: 'Coatings',
    description: 'Choose the coatings to include.',
    optionGroup: 'custom-coatings',
    showWhen: allOf(standardGlazingSelected, { type: 'selected', option: 'custom-package' }),
  },
];
