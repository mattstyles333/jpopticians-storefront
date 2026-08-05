import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLensConfig, lensConfig } from '../src/lens-config';
import { implementedSupplierRoutes, supplierGlazingRouteConfigs } from '../src/lens-config/supplier-glazing';
import { officialSupplierRoutes } from '../src/types';
import type { LensCondition } from '../src/types';

function referencedOptionIds(condition: LensCondition): string[] {
  if (condition.type === 'selected' || condition.type === 'notSelected') return [condition.option];
  if (condition.type === 'and' || condition.type === 'or') return condition.conditions.flatMap(referencedOptionIds);
  if (condition.type === 'not') return referencedOptionIds(condition.condition);
  return [];
}

describe('lens config integrity', () => {
  it('has an option group for every step', () => {
    for (const step of lensConfig.steps) {
      assert.ok(lensConfig.options[step.optionGroup], `Missing option group for step ${step.id}: ${step.optionGroup}`);
    }
  });

  it('has Magento codes and unique option IDs in every group', () => {
    for (const [groupId, group] of Object.entries(lensConfig.options)) {
      assert.ok(group.magentoCode, `Missing Magento code for group ${groupId}`);

      const optionIds = new Set<string>();
      for (const option of group.options) {
        assert.ok(option.magentoCode, `Missing Magento code for option ${groupId}/${option.id}`);
        assert.equal(optionIds.has(option.id), false, `Duplicate option ID in group ${groupId}: ${option.id}`);
        optionIds.add(option.id);
      }
    }
  });

  it('uses additive prices that Magento custom options can reproduce', () => {
    for (const [groupId, group] of Object.entries(lensConfig.options)) {
      for (const option of group.options) {
        assert.equal(option.priceOverrides?.length ?? 0, 0, `Conditional price override in ${groupId}/${option.id}`);
        assert.equal(option.priceAdjustments?.length ?? 0, 0, `Conditional price adjustment in ${groupId}/${option.id}`);
      }
    }
  });

  it('points child option groups at existing groups', () => {
    for (const [groupId, group] of Object.entries(lensConfig.options)) {
      for (const option of group.options) {
        if (!option.childOptionsGroup) {
          continue;
        }

        assert.ok(lensConfig.options[option.childOptionsGroup], `Missing child group for ${groupId}/${option.id}: ${option.childOptionsGroup}`);
      }
    }
  });

  it('has a glazing route option for every implemented supplier route', () => {
    const routeOptionIds = new Set(lensConfig.options['glazing-route']?.options.map((option) => option.id));

    for (const route of implementedSupplierRoutes) {
      assert.equal(routeOptionIds.has(route), true, `Missing glazing route option for ${route}`);
    }
  });

  it('keeps supplier route configs aligned with implemented route IDs', () => {
    assert.deepEqual(
      supplierGlazingRouteConfigs.map((config) => config.id),
      implementedSupplierRoutes
    );
  });

  it('has implemented config for every official supplier route', () => {
    assert.deepEqual(new Set(implementedSupplierRoutes), new Set(officialSupplierRoutes));
  });

  it('references only existing option IDs in conditions', () => {
    const optionIds = new Set(Object.values(lensConfig.options).flatMap((group) => group.options.map((option) => option.id)));
    for (const [groupId, group] of Object.entries(lensConfig.options)) {
      for (const option of group.options) {
        for (const condition of [
          option.showWhen,
          option.disabledWhen,
          ...option.priceOverrides?.map((rule) => rule.when) ?? [],
          ...option.priceAdjustments?.map((rule) => rule.when) ?? [],
        ]) {
          if (!condition) continue;
          for (const referencedId of referencedOptionIds(condition)) {
            assert.equal(optionIds.has(referencedId), true, `Unknown condition option in ${groupId}/${option.id}: ${referencedId}`);
          }
        }
      }
    }
    for (const step of lensConfig.steps) {
      if (!step.showWhen) continue;
      for (const referencedId of referencedOptionIds(step.showWhen)) {
        assert.equal(optionIds.has(referencedId), true, `Unknown condition option in step ${step.id}: ${referencedId}`);
      }
    }
  });

  it('uses globally unique option IDs for selection conditions', () => {
    const owners = new Map<string, string>();
    for (const [groupId, group] of Object.entries(lensConfig.options)) {
      for (const option of group.options) {
        assert.equal(owners.has(option.id), false, `Option ID ${option.id} is shared by ${owners.get(option.id)} and ${groupId}`);
        owners.set(option.id, groupId);
      }
    }
  });

  it('has an acyclic child-group graph', () => {
    function visit(groupId: string, path: Set<string>) {
      assert.equal(path.has(groupId), false, `Child-group cycle at ${groupId}`);
      const nextPath = new Set(path).add(groupId);
      for (const child of lensConfig.options[groupId]?.options.map((option) => option.childOptionsGroup).filter(Boolean) ?? []) {
        visit(child as string, nextPath);
      }
    }

    for (const step of lensConfig.steps) visit(step.optionGroup, new Set());
  });

  it('creates independent configuration instances', () => {
    const first = createLensConfig();
    const second = createLensConfig();
    first.currency.code = 'USD';
    first.options.tint.title = 'Changed';

    assert.equal(second.currency.code, 'GBP');
    assert.equal(second.options.tint.title, 'Tint');
  });

  it('places the exclusive uncoated choice after all coating upgrades', () => {
    const coatings = lensConfig.options['custom-coatings'];
    assert.equal(coatings.options.find((option) => option.id === 'uncoated')?.exclusive, true);
    assert.equal(coatings.options.filter((option) => option.exclusive).length, 1);
    assert.equal(coatings.options.at(-1)?.id, 'uncoated');
  });
});
