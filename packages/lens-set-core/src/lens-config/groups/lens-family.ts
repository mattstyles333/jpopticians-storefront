import type { LensOptionGroup } from '../../types';

export const lensFamilyGroup: LensOptionGroup = {
  title: 'Lens type',
  required: true,
  type: 'radio',
  magentoCode: 'lens_family',
  options: [
    {
      id: 'single-vision',
      title: 'Single Vision',
      description: 'For one main viewing distance: reading, intermediate, or distance.',
      price: 0,
      magentoCode: 'lens_family',
    },
    {
      id: 'progressive',
      title: 'Multifocal',
      description: 'For bifocal, varifocal, or occupational lenses.',
      price: 0,
      magentoCode: 'lens_family',
    },
    {
      id: 'non-prescription',
      title: 'Non-Prescription',
      description: 'For included demo lenses or configurable fashion lenses without a prescription.',
      price: 0,
      magentoCode: 'lens_family',
    },
  ],
};
