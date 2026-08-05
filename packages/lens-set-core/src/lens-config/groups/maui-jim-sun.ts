import type { LensOption, LensOptionGroup } from '../../types';
import { selectedAny } from '../helpers';

function retailPrice(wholesalePrice: number): number {
  return wholesalePrice * 1.3 + 30;
}

const brilliantMaterialIds = ['maui-brilliant-single-vision', 'maui-brilliant-varifocal'];
const evolutionMaterialIds = ['maui-evolution-single-vision', 'maui-evolution-varifocal'];
const polycarbonateMaterialIds = ['maui-polycarbonate-single-vision', 'maui-polycarbonate-varifocal'];

export const mauiJimMaterialOptionIds = [
  ...brilliantMaterialIds,
  ...evolutionMaterialIds,
  ...polycarbonateMaterialIds,
];

function biGradient(baseColour: string, mirrorColour: string): string {
  return `linear-gradient(to bottom, ${mirrorColour} 0%, ${baseColour} 30%, ${baseColour} 70%, ${mirrorColour} 100%)`;
}

function gradientMirror(baseColour: string, mirrorColour: string): string {
  return `linear-gradient(to bottom, ${mirrorColour} 0%, ${baseColour} 55%, ${baseColour} 100%)`;
}

const biGradientWhen = selectedAny(...mauiJimMaterialOptionIds);
const mauiGradientWhen = selectedAny(...brilliantMaterialIds, ...evolutionMaterialIds);
const brilliantExclusiveWhen = selectedAny(...brilliantMaterialIds);

const mauiJimLensColourOptions: LensOption[] = [
  {
    id: 'maui-bi-gradient-neutral-grey',
    title: 'Neutral Grey Bi-Gradient',
    description: 'Neutral Grey with a silver double-gradient mirror at the top and bottom.',
    badgeLabel: 'Bi-Gradient',
    price: 0,
    color: biGradient('#4A4A4A', '#D7DEE8'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: biGradientWhen,
  },
  {
    id: 'maui-bi-gradient-hcl-bronze',
    title: 'HCL Bronze Bi-Gradient',
    description: 'HCL Bronze with a gold double-gradient mirror at the top and bottom.',
    badgeLabel: 'Bi-Gradient',
    price: 0,
    color: biGradient('#8A5C2E', '#D8AE58'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: biGradientWhen,
  },
  {
    id: 'maui-bi-gradient-maui-rose',
    title: 'Maui Rose Bi-Gradient',
    description: 'Maui Rose with a silver double-gradient mirror at the top and bottom.',
    badgeLabel: 'Bi-Gradient',
    price: 0,
    color: biGradient('#9F5267', '#E2E8F0'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: biGradientWhen,
  },
  {
    id: 'maui-bi-gradient-maui-ht',
    title: 'Maui HT Bi-Gradient',
    description: 'High-transmission Maui HT with a gold double-gradient mirror at the top and bottom.',
    badgeLabel: 'Bi-Gradient',
    price: 0,
    color: biGradient('#858A38', '#D8AE58'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: biGradientWhen,
  },
  {
    id: 'maui-gradient-neutral-grey',
    title: 'Neutral Grey MauiGradient',
    description: 'Neutral Grey with a silver gradient mirror that softens down the lens.',
    badgeLabel: 'MauiGradient',
    price: 0,
    color: gradientMirror('#4A4A4A', '#D7DEE8'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: mauiGradientWhen,
  },
  {
    id: 'maui-gradient-hcl-bronze',
    title: 'HCL Bronze MauiGradient',
    description: 'HCL Bronze with a gold gradient mirror that softens down the lens.',
    badgeLabel: 'MauiGradient',
    price: 0,
    color: gradientMirror('#8A5C2E', '#D8AE58'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: mauiGradientWhen,
  },
  {
    id: 'maui-gradient-maui-rose',
    title: 'Maui Rose MauiGradient',
    description: 'Maui Rose with a silver gradient mirror that softens down the lens.',
    badgeLabel: 'MauiGradient',
    price: 0,
    color: gradientMirror('#9F5267', '#E2E8F0'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: mauiGradientWhen,
  },
  {
    id: 'maui-gradient-maui-ht',
    title: 'Maui HT MauiGradient',
    description: 'High-transmission Maui HT with a gold gradient mirror that softens down the lens.',
    badgeLabel: 'MauiGradient',
    price: 0,
    color: gradientMirror('#858A38', '#D8AE58'),
    magentoCode: 'maui_jim_lens_colour',
    showWhen: mauiGradientWhen,
  },
  {
    id: 'maui-brilliant-blue-hawaii',
    title: 'Blue Hawaii',
    description: 'A vivid blue solid mirror exclusive to MauiBrilliant.',
    badgeLabel: 'MauiBrilliant Exclusive',
    price: 0,
    color: 'linear-gradient(135deg, #0B3D91, #0EA5E9, #BAE6FD)',
    magentoCode: 'maui_jim_lens_colour',
    showWhen: brilliantExclusiveWhen,
  },
  {
    id: 'maui-brilliant-maui-sunrise',
    title: 'MAUI Sunrise',
    description: 'A vivid pink solid mirror exclusive to MauiBrilliant.',
    badgeLabel: 'MauiBrilliant Exclusive',
    price: 0,
    color: 'linear-gradient(135deg, #7A284B, #EC4899, #FBCFE8)',
    magentoCode: 'maui_jim_lens_colour',
    showWhen: brilliantExclusiveWhen,
  },
  {
    id: 'maui-brilliant-hawaii-lava',
    title: 'HAWAII LAVA',
    description: 'A vivid red-orange solid mirror exclusive to MauiBrilliant.',
    badgeLabel: 'MauiBrilliant Exclusive',
    price: 0,
    color: 'linear-gradient(135deg, #7F1D1D, #EF4444, #FDBA74)',
    magentoCode: 'maui_jim_lens_colour',
    showWhen: brilliantExclusiveWhen,
  },
  {
    id: 'maui-brilliant-maui-green',
    title: 'MAUIGreen',
    description: 'A vivid green solid mirror exclusive to MauiBrilliant.',
    badgeLabel: 'MauiBrilliant Exclusive',
    price: 0,
    color: 'linear-gradient(135deg, #064E3B, #10B981, #A7F3D0)',
    magentoCode: 'maui_jim_lens_colour',
    showWhen: brilliantExclusiveWhen,
  },
];

export const mauiJimSunGroups: Record<string, LensOptionGroup> = {
  'maui-jim-vision-type': {
    title: 'Maui Jim lens type',
    required: true,
    type: 'radio',
    magentoCode: 'maui_jim_vision_type',
    options: [
      {
        id: 'maui-jim-distance',
        title: 'Distance',
        description: 'For driving, walking around, and general distance vision.',
        price: 0,
        magentoCode: 'maui_jim_vision_type',
      },
      {
        id: 'maui-jim-reading',
        title: 'Reading',
        description: 'For close-up reading and near tasks.',
        price: 0,
        magentoCode: 'maui_jim_vision_type',
      },
      {
        id: 'maui-jim-varifocal',
        title: 'Varifocal',
        description: 'Maui Jim varifocal lenses for distance and reading in one pair.',
        price: 0,
        magentoCode: 'maui_jim_vision_type',
      },
    ],
  },
  'maui-jim-lens-material': {
    title: 'Maui Jim lens material',
    required: true,
    type: 'radio',
    magentoCode: 'maui_jim_lens_material',
    options: [
      {
        id: 'maui-brilliant-single-vision',
        title: 'Maui Brilliant',
        description: 'Premium Maui Jim prescription sun lens material.',
        price: retailPrice(200),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'or', conditions: [{ type: 'selected', option: 'maui-jim-distance' }, { type: 'selected', option: 'maui-jim-reading' }] },
      },
      {
        id: 'maui-evolution-single-vision',
        title: 'Maui Evolution',
        description: 'Lightweight Maui Jim prescription sun lens material.',
        price: retailPrice(180),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'or', conditions: [{ type: 'selected', option: 'maui-jim-distance' }, { type: 'selected', option: 'maui-jim-reading' }] },
      },
      {
        id: 'maui-polycarbonate-single-vision',
        title: 'Polycarbonate',
        description: 'Durable Maui Jim prescription sun lens material.',
        price: retailPrice(160),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'or', conditions: [{ type: 'selected', option: 'maui-jim-distance' }, { type: 'selected', option: 'maui-jim-reading' }] },
      },
      {
        id: 'maui-brilliant-varifocal',
        title: 'Maui Brilliant',
        description: 'Premium Maui Jim varifocal sun lens material.',
        price: retailPrice(240),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'selected', option: 'maui-jim-varifocal' },
      },
      {
        id: 'maui-evolution-varifocal',
        title: 'Maui Evolution',
        description: 'Lightweight Maui Jim varifocal sun lens material.',
        price: retailPrice(220),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'selected', option: 'maui-jim-varifocal' },
      },
      {
        id: 'maui-polycarbonate-varifocal',
        title: 'Polycarbonate',
        description: 'Durable Maui Jim varifocal sun lens material.',
        price: retailPrice(200),
        magentoCode: 'maui_jim_lens_material',
        showWhen: { type: 'selected', option: 'maui-jim-varifocal' },
      },
    ],
  },
  'maui-jim-lens-colour': {
    title: 'Maui Jim lens colour',
    required: true,
    type: 'radio',
    magentoCode: 'maui_jim_lens_colour',
    options: mauiJimLensColourOptions,
  },
};
