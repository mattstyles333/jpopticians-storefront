import type { LensOptionGroup } from '../../types';
import { supplierGlazingRouteOptions } from '../supplier-glazing';

export const glazingRouteGroup: LensOptionGroup = {
  title: 'Lens glazing',
  required: true,
  type: 'radio',
  magentoCode: 'glazing_route',
  options: [
    {
      id: 'spex4less',
      title: 'Spex4Less in-house lab',
      description: 'Our default UK lab route. Best value for most customers, with the widest choice of lens options and faster control over the order.',
      price: 0,
      magentoCode: 'glazing_route',
      badgeLabel: 'Recommended',
      badgePrice: 10,
      badgePricePrefix: 'From',
      details: ['More lens, tint, coating and index choices', 'Usually better value than official supplier lenses', 'No official brand lens engraving'],
      imageKind: 'lab',
    },
    ...supplierGlazingRouteOptions,
  ],
};
