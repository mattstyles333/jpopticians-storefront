import type { LensOptionGroup } from '../../types';
import { allOf } from '../helpers';
import { baseCurveFrame, eyeSizeBlocksVarifocal, rimlessFrame } from '../conditions';

export const useCaseGroup: LensOptionGroup = {
  title: 'Lens type',
  required: true,
  type: 'radio',
  magentoCode: 'use_case',
  options: [
    { id: 'distance', title: 'Distance', description: 'For driving and general everyday distance vision.', price: 0, showWhen: { type: 'not', condition: baseCurveFrame }, magentoCode: 'use_case' },
    { id: 'reading', title: 'Reading', description: 'For close-up tasks such as books, phones, and hobbies.', price: 0, showWhen: { type: 'not', condition: baseCurveFrame }, magentoCode: 'use_case' },
    { id: 'varifocal', title: 'Varifocal', description: 'Distance, intermediate, and reading vision in one lens with no visible line.', price: 0, showWhen: allOf({ type: 'not', condition: baseCurveFrame }, { type: 'not', condition: eyeSizeBlocksVarifocal }), magentoCode: 'use_case' },
    { id: 'occupational', title: 'Office / occupational', description: 'A wider near and intermediate view for desk, screen, and room-distance work.', price: 0, magentoCode: 'use_case' },
    { id: 'intermediate', title: 'Intermediate', description: 'For one fixed computer or arm\'s-length viewing distance.', price: 0, showWhen: { type: 'not', condition: baseCurveFrame }, magentoCode: 'use_case' },
    { id: 'bifocal', title: 'Bifocal', description: 'Distance and reading vision in one lens with a visible segment.', price: 0, showWhen: allOf({ type: 'not', condition: baseCurveFrame }, { type: 'not', condition: rimlessFrame }), magentoCode: 'use_case' },
    { id: 'frame-only', title: 'Demo lenses (included)', description: 'Keep the frame\'s included non-prescription demo lenses with no lens upgrades.', price: 0, magentoCode: 'use_case' },
    { id: 'fashion-lenses', title: 'Fashion lenses', description: 'Non-prescription lenses with tint, blue light, and package choices.', price: 10, magentoCode: 'use_case' },
  ],
};
