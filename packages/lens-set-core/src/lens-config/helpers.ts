import type { LensCondition } from '../types';

export function selectedAny(...options: string[]): LensCondition {
  return {
    type: 'or',
    conditions: options.map((option) => ({ type: 'selected', option })),
  };
}

export function notSelectedAny(...options: string[]): LensCondition {
  return {
    type: 'and',
    conditions: options.map((option) => ({ type: 'notSelected', option })),
  };
}

export function allOf(...conditions: LensCondition[]): LensCondition {
  return {
    type: 'and',
    conditions,
  };
}

export function anyOf(...conditions: LensCondition[]): LensCondition {
  return {
    type: 'or',
    conditions,
  };
}
