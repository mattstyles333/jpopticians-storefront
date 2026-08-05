import { appVersion } from '../app-version';

export const lensConfigMeta = {
  version: appVersion,
  currency: {
    symbol: '\u00A3',
    code: 'GBP',
  },
  basePrice: 0,
} as const;
