import type { LensConfig } from '../../types';
import { bifocalSelected, essilorDesignSelected, rimlessFrame, zeissDesignSelected } from '../conditions';
import { allOf, notSelectedAny, selectedAny } from '../helpers';
const bifocalTintNeedsStandardIndex = allOf(
  bifocalSelected,
  selectedAny('photochromic', 'transitions-gen-s', 'xtractive', 'polarised-grey', 'polarised-brown')
);

export const packageGroups: Pick<LensConfig['options'], 'package' | 'custom-index' | 'custom-coatings'> = {
  package: {
    title: 'Package',
    required: true,
    type: 'radio',
    magentoCode : 'package',
    options: [
      { id: 'essential-package', title: 'Essential', description: 'A strong entry package with standard coatings.', price: 0, magentoCode: 'package' },
      { id: 'premium-package', title: 'Premium', description: 'Thinner, cleaner, more durable everyday package.', price: 45, magentoCode: 'package' },
      { id: 'elite-package', title: 'Elite', description: 'Top package for comfort, durability, and appearance.', price: 85, magentoCode: 'package' },
      { id: 'custom-package', title: 'Custom', description: 'Choose your own index and coatings.', price: 0, magentoCode: 'package' },
    ],
  },
  'custom-index': {
    title: 'Lens index',
    required: true,
    type: 'radio',
    magentoCode: 'custom_index',
    options: [
      { id: 'index-15', title: '1.5 Standard', description: 'Standard thickness lens material.', price: 0, magentoCode: 'custom_index', showWhen: { type: 'not', condition: rimlessFrame } },
      { id: 'index-16', title: '1.6 Thin', description: 'A lighter, thinner option.', price: 35, magentoCode: 'custom_index', showWhen: allOf(notSelectedAny('bifocal-r28'), { type: 'not', condition: bifocalTintNeedsStandardIndex }) },
      { id: 'index-167', title: '1.67 Extra Thin', description: 'A slimmer choice for stronger prescriptions.', price: 70, magentoCode: 'custom_index', showWhen: allOf(notSelectedAny('bifocal-r28'), { type: 'not', condition: bifocalTintNeedsStandardIndex }) },
      {
        id: 'index-174',
        title: '1.74 Super Thin',
        description: 'The thinnest index available.',
        price: 110,
        showWhen: notSelectedAny('occupational', 'bifocal', 'mirror', 'photochromic', 'transitions-gen-s', 'xtractive', 'sunglasses', 'fashion-sunglasses', 'blue-light', 'bifocal-r28'),
        disabledWhen: rimlessFrame,
        disabledReason: '1.74 super thin is not available for rimless frames.',
        magentoCode: 'custom_index',
      },
    ],
  },
  'custom-coatings': {
    title: 'Coatings',
    required: true,
    type: 'checkbox',
    magentoCode: 'custom_coatings',
    options: [
      {
        id: 'anti-reflective',
        title: 'Anti-Reflective',
        description: 'Cuts reflections and improves clarity.',
        price: 15,
        magentoCode: 'custom_coatings',
        showWhen: notSelectedAny('blue-light'),
      },
      {
        id: 'anti-glare-durable',
        title: 'Hard Coat',
        description: 'Adds scratch resistance and durability for daily wear.',
        price: 18,
        magentoCode: 'custom_coatings',
        showWhen: notSelectedAny('blue-light'),
      },
      {
        id: 'hydrophobic',
        title: 'Hydrophobic',
        description: 'Repels water and smudges.',
        price: 10,
        magentoCode: 'custom_coatings',
        showWhen: notSelectedAny('blue-light'),
      },
      {
        id: 'uv-protection',
        title: 'UV Protection',
        description: 'Extra UV filtering.',
        price: 5,
        magentoCode: 'custom_coatings',
        showWhen: notSelectedAny('blue-light', 'sunglasses', 'fashion-sunglasses', 'mirror'),
      },
      {
        id: 'blue-light-coating',
        title: 'Blue Light Coating',
        description: 'Extra comfort for heavy screen use.',
        price: 20,
        magentoCode: 'custom_coatings',
        showWhen: notSelectedAny('blue-light', 'fashion-lenses', 'sunglasses', 'fashion-sunglasses', 'mirror'),
      },
      {
        id: 'zeiss-blueguard',
        title: 'ZEISS BlueGuard',
        description: 'Only available on ZEISS varifocal and occupational designs.',
        price: 35,
        magentoCode: 'custom_coatings',
        showWhen: allOf(zeissDesignSelected, notSelectedAny('blue-light')),
      },
      {
        id: 'duravision-platinum-uv',
        title: 'DuraVision Platinum UV',
        description: 'ZEISS premium coating package.',
        price: 45,
        magentoCode: 'custom_coatings',
        showWhen: allOf(zeissDesignSelected, notSelectedAny('blue-light')),
      },
      {
        id: 'crizal-easy',
        title: 'Crizal Easy',
        description: 'Essilor easy-care coating package.',
        price: 30,
        magentoCode: 'custom_coatings',
        showWhen: allOf(essilorDesignSelected, notSelectedAny('blue-light')),
      },
      {
        id: 'essilor-crizal-sapphire',
        title: 'Essilor Crizal Sapphire',
        description: 'Essilor premium Crizal coating package.',
        price: 45,
        magentoCode: 'custom_coatings',
        showWhen: allOf(essilorDesignSelected, notSelectedAny('blue-light')),
      },
      { id: 'uncoated', title: 'Uncoated', description: 'No extra coating added.', price: 0, magentoCode: 'custom_coatings', exclusive: true },
    ],
  },
};
