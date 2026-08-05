import type { LensOptionGroup } from '../../types';

export const frameTypeGroup: LensOptionGroup = {
  title: 'Frame type',
  required: true,
  type: 'radio',
  magentoCode: 'frame_type',
  options: [
    {
      id: 'full-rim',
      title: 'Full-rimmed',
      description: 'Standard reglaze with the lens fully enclosed by the frame.',
      price: 0,
      magentoCode: 'frame_type',
    },
    {
      id: 'semi-rimless',
      title: 'Semi-rimless',
      description: 'Suitable for frames with a groove or tension wire.',
      price: 0,
      magentoCode: 'frame_type',
    },
    {
      id: 'rimless',
      title: 'Rimless',
      description: 'Includes the additional handling and drill-mount work.',
      price: 10,
      magentoCode: 'frame_type',
    },
    {
      id: 'wrap',
      title: 'Wrap / sports frame',
      description: 'Includes the additional surcharge for wrap and sports frames.',
      price: 30,
      magentoCode: 'frame_type',
    },
  ],
};
