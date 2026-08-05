import type { LensConfig } from '../../types';
import { bifocalSelected, rimlessFrame } from '../conditions';
import { allOf, notSelectedAny, selectedAny } from '../helpers';

const rimlessBifocal = allOf(rimlessFrame, bifocalSelected);

export const tintGroups: Pick<
  LensConfig['options'],
  'tint' | 'tint-colour' | 'tint-density' | 'mirror-colour' | 'photochromic-colour' | 'transitions-colour' | 'xtractive-colour'
> = {
  tint: {
    title: 'Tint',
    required: true,
    type: 'radio',
    magentoCode: 'tint_type',
    options: [
      { id: 'clear', title: 'Clear', description: 'No extra tint or colour treatment.', price: 0, magentoCode: 'tint_type' },
      {
        id: 'sunglasses',
        title: 'Sunglasses',
        description: 'A fixed sunglass tint.',
        price: 20,
        childOptionsGroup: 'tint-colour',
        magentoCode: 'tint_type',
        showWhen: notSelectedAny('occupational', 'intermediate', 'fashion-lenses'),
        details: ['85% tint density and UVA/UVB protection are included.', 'Polarised colours add £30.'],
      },
      {
        id: 'fashion-sunglasses',
        title: 'Sunglasses',
        description: 'A fixed non-prescription sunglass tint.',
        price: 0,
        childOptionsGroup: 'tint-colour',
        magentoCode: 'tint_type',
        showWhen: { type: 'selected', option: 'fashion-lenses' },
        details: ['85% tint density and UVA/UVB protection are included.', 'Polarised colours add £30.'],
      },
      { id: 'mirror', title: 'Mirror', description: 'A mirrored finish for a stronger sunwear look.', price: 35, childOptionsGroup: 'mirror-colour', magentoCode: 'tint_type', showWhen: allOf(notSelectedAny('occupational', 'intermediate', 'bifocal', 'fashion-lenses'), { type: 'not', condition: rimlessFrame }) },
      {
        id: 'photochromic',
        title: 'Standard Photochromic',
        description: 'Everyday light-reactive lenses.',
        price: 65,
        childOptionsGroup: 'photochromic-colour',
        magentoCode: 'tint_type',
        showWhen: allOf(
          notSelectedAny('occupational', 'intermediate', 'fashion-lenses'),
          { type: 'not', condition: rimlessBifocal },
          { type: 'not', condition: selectedAny('bifocal-r28') }
        ),
      },
      {
        id: 'transitions-gen-s',
        title: 'Transitions Gen S',
        description: 'Higher-performance Transitions option.',
        price: 85,
        childOptionsGroup: 'transitions-colour',
        magentoCode: 'tint_type',
        showWhen: allOf(
          notSelectedAny('occupational', 'intermediate', 'fashion-lenses'),
          { type: 'not', condition: rimlessBifocal },
          { type: 'not', condition: selectedAny('bifocal-r28') }
        ),
      },
      {
        id: 'xtractive',
        title: 'XTRActive',
        description: 'Stronger darkening outdoors and behind the wheel.',
        price: 105,
        childOptionsGroup: 'xtractive-colour',
        magentoCode: 'tint_type',
        showWhen: allOf(
          notSelectedAny('occupational', 'intermediate', 'fashion-lenses'),
          { type: 'not', condition: rimlessBifocal },
          { type: 'not', condition: selectedAny('bifocal-r28') }
        ),
      },
      {
        id: 'blue-light',
        title: 'Blue Light',
        description: 'Blue light / blue-cut filtering for screen-heavy use.',
        price: 25,
        magentoCode: 'tint_type',
        showWhen: notSelectedAny('mirror', 'photochromic', 'transitions-gen-s', 'xtractive', 'sunglasses'),
      },
    ],
  },
  'tint-colour': {
    title: 'Tint colour',
    required: true,
    type: 'radio',
    magentoCode: 'tint_colour',
    options: [
      { id: 'sunglasses-grey', title: 'Grey', price: 0, color: '#696969', magentoCode: 'tint_colour', childOptionsGroup: 'tint-density' },
      { id: 'sunglasses-brown', title: 'Brown', price: 0, color: '#8B4513', magentoCode: 'tint_colour', childOptionsGroup: 'tint-density' },
      { id: 'yellow-tint', title: 'Yellow', price: 0, color: '#D8B11E', magentoCode: 'tint_colour', childOptionsGroup: 'tint-density', showWhen: notSelectedAny('bifocal', 'varifocal') },
      { id: 'orange-tint', title: 'Orange', price: 0, color: '#F28C28', magentoCode: 'tint_colour', childOptionsGroup: 'tint-density', showWhen: notSelectedAny('bifocal', 'varifocal') },
      {
        id: 'polarised-grey',
        title: 'Polarised Grey',
        price: 30,
        color: '#4A4A4A',
        magentoCode: 'tint_colour',
        showWhen: allOf(notSelectedAny('bifocal-r28'), { type: 'not', condition: rimlessBifocal }),
      },
      {
        id: 'polarised-brown',
        title: 'Polarised Brown',
        price: 30,
        color: '#6B4423',
        magentoCode: 'tint_colour',
        showWhen: allOf(notSelectedAny('bifocal-r28'), { type: 'not', condition: rimlessBifocal }),
      },
    ],
  },
  'tint-density': {
    title: 'Tint density',
    required: true,
    type: 'radio',
    magentoCode: 'tint_density',
    options: [
      { id: 'tint-density-10', title: '10%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-20', title: '20%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-30', title: '30%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-40', title: '40%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-50', title: '50%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-60', title: '60%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-70', title: '70%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-80', title: '80%', price: 10, magentoCode: 'tint_density' },
      { id: 'tint-density-85', title: '85% (standard)', price: 0, magentoCode: 'tint_density', badgeLabel: 'Included' },
      { id: 'tint-density-90', title: '90%', price: 10, magentoCode: 'tint_density' },
    ],
  },
  'mirror-colour': {
    title: 'Mirror finish',
    required: true,
    type: 'radio',
    magentoCode: 'mirror_colour',
    options: [
      { id: 'mirror-silver', title: 'Silver', price: 0, color: '#C0C0C0', magentoCode: 'mirror_colour' },
      { id: 'mirror-blue', title: 'Blue', price: 0, color: '#1E90FF', magentoCode: 'mirror_colour' },
      { id: 'mirror-red-fire', title: 'Red Fire', price: 0, color: '#FF4500', magentoCode: 'mirror_colour' },
    ],
  },
  'photochromic-colour': {
    title: 'Photochromic colour',
    required: true,
    magentoCode: 'photochromic_colour',
    type: 'radio',
    options: [
      { id: 'photochromic-grey', title: 'Grey', price: 0, color: '#696969', magentoCode: 'photochromic_colour' },
      { id: 'photochromic-brown', title: 'Brown', price: 0, color: '#8B4513', magentoCode: 'photochromic_colour' },
    ],
  },
  'transitions-colour': {
    title: 'Transitions colour',
    required: true,
    type: 'radio',
    magentoCode: 'transitions_colour',
    options: [
      { id: 'transitions-grey', title: 'Grey', price: 0, color: '#696969', magentoCode: 'transitions_colour' },
      { id: 'transitions-brown', title: 'Brown', price: 0, color: '#8B4513', magentoCode: 'transitions_colour' },
      { id: 'transitions-emerald', title: 'Emerald', price: 0, color: '#50C878', magentoCode: 'transitions_colour' },
    ],
  },
  'xtractive-colour': {
    title: 'XTRActive colour',
    required: true,
    type: 'radio',
    magentoCode: 'xtractive_colour',
    options: [
      { id: 'xtractive-grey', title: 'Grey', price: 0, color: '#696969', magentoCode: 'xtractive_colour' },
      { id: 'xtractive-brown', title: 'Brown', price: 0, color: '#8B4513', magentoCode: 'xtractive_colour' },
    ],
  },
};
