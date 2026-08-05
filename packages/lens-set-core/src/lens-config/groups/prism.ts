import type { LensOptionGroup } from '../../types';

export const prismGroup: LensOptionGroup = {
  title: 'Prism',
  required: true,
  type: 'radio',
  magentoCode: 'prism',
  options: [
    {
      id: 'no-prism',
      title: 'No prism',
      description: 'My prescription does not include prism values.',
      price: 0,
      magentoCode: 'prism',
    },
    {
      id: 'prism-required',
      title: 'My prescription includes prism',
      description: 'Adds £30 for prism processing. Enter the values exactly as written or include them in your upload.',
      price: 30,
      magentoCode: 'prism',
      details: ['We will review the prism and contact you if we need any additional measurements or cannot complete the order.'],
    },
  ],
};
