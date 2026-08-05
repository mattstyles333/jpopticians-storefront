import type { LensOptionGroup } from '../../types';
import { luxotticaLensColourOptions, luxotticaLensOptions, luxotticaVisionTypeOptions } from '../supplier-glazing';

export const luxotticaAuthenticsGroups: Record<string, LensOptionGroup> = {
  'luxottica-vision-type': {
    title: 'Branded lens type',
    required: true,
    type: 'radio',
    magentoCode: 'luxottica_vision_type',
    options: luxotticaVisionTypeOptions,
  },
  'luxottica-lens-option': {
    title: 'Branded lens option',
    required: true,
    type: 'radio',
    magentoCode: 'luxottica_lens_option',
    options: luxotticaLensOptions,
  },
  'luxottica-lens-colour': {
    title: 'Branded lens colour',
    required: true,
    type: 'radio',
    magentoCode: 'luxottica_lens_colour',
    options: luxotticaLensColourOptions,
  },
};
