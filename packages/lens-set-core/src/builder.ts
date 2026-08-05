import { validatePrescriptionState } from './prescription';
import { prescriptionMethods } from './types';
import type {
  ComputedOption,
  FrameContext,
  LensCondition,
  LensConfig,
  LensOption,
  LensOptionGroup,
  LensStep,
  PrescriptionAttachmentMetadata,
  PrescriptionMethod,
  PrescriptionState,
  PriceLineItem,
  SelectionMap,
  VisibleSelection,
} from './types';

export function getAllSelectedOptions(selections: SelectionMap): string[] {
  return Object.values(selections).flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
}

export function hasActiveParentSelection(config: LensConfig, groupId: string, selections: SelectionMap): boolean {
  function isActiveChild(targetGroupId: string, visited: Set<string>): boolean {
    if (visited.has(targetGroupId)) {
      return false;
    }
    const nextVisited = new Set(visited).add(targetGroupId);

    for (const [parentGroupId, parentGroup] of Object.entries(config.options)) {
      const parentStep = config.steps.find((step) => step.optionGroup === parentGroupId);
      const selectionKey = parentStep?.id ?? parentGroupId;
      const selected = selections[selectionKey];
      const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : [];

      if (!parentGroup.options.some((option) => option.childOptionsGroup === targetGroupId && selectedIds.includes(option.id))) {
        continue;
      }
      if (parentStep || isActiveChild(parentGroupId, nextVisited)) {
        return true;
      }
    }
    return false;
  }

  return isActiveChild(groupId, new Set());
}

export function evaluateCondition(
  condition: LensCondition,
  selections: SelectionMap,
  frameData: Record<string, unknown> = {}
): boolean {
  switch (condition.type) {
    case 'selected':
      return getAllSelectedOptions(selections).includes(condition.option);
    case 'notSelected':
      return !getAllSelectedOptions(selections).includes(condition.option);
    case 'frame': {
      const frameValue = frameData[condition.property];
      const targetValue = condition.value;

      switch (condition.operator) {
        case '==':
          return frameValue === targetValue;
        case '!=':
          return frameValue !== targetValue;
        case '>':
          return typeof frameValue === 'number' && typeof targetValue === 'number' && frameValue > targetValue;
        case '<':
          return typeof frameValue === 'number' && typeof targetValue === 'number' && frameValue < targetValue;
        case '>=':
          return typeof frameValue === 'number' && typeof targetValue === 'number' && frameValue >= targetValue;
        case '<=':
          return typeof frameValue === 'number' && typeof targetValue === 'number' && frameValue <= targetValue;
        case 'in':
          if (!Array.isArray(targetValue)) {
            return false;
          }
          if (Array.isArray(frameValue)) {
            return frameValue.some((value) => targetValue.includes(value as never));
          }
          return targetValue.includes(frameValue as never);
        case 'notIn':
          if (!Array.isArray(targetValue)) {
            return false;
          }
          if (Array.isArray(frameValue)) {
            return frameValue.every((value) => !targetValue.includes(value as never));
          }
          return !targetValue.includes(frameValue as never);
      }
    }
    case 'and':
      return condition.conditions.every((nested) => evaluateCondition(nested, selections, frameData));
    case 'or':
      return condition.conditions.some((nested) => evaluateCondition(nested, selections, frameData));
    case 'not':
      return !evaluateCondition(condition.condition, selections, frameData);
  }
}

export function getFrameData(frame: FrameContext): Record<string, unknown> {
  return {
    frameSku: frame.frameSku,
    frameName: frame.frameName,
    frameType: frame.frameType,
    framePrice: frame.framePrice,
    baseCurve: frame.baseCurve,
    eyeSize: frame.eyeSize,
    lensProductSku: frame.lensProductSku,
    source: frame.source,
    supplierGlazingRoutes: frame.supplierGlazingRoutes,
    brandedLensRoute: frame.brandedLensRoute,
    hasSupplierGlazing: frame.supplierGlazingRoutes.length > 0,
    disallowedOptions: frame.restrictions.disallowedOptions,
  };
}

export function isStepVisible(config: LensConfig, step: LensStep, selections: SelectionMap, frame: FrameContext): boolean {
  if (!step.showWhen) {
    return true;
  }

  return evaluateCondition(step.showWhen, selections, getFrameData(frame));
}

export function getVisibleSteps(config: LensConfig, selections: SelectionMap, frame: FrameContext): LensStep[] {
  return config.steps.filter((step) => isStepVisible(config, step, selections, frame));
}

export function getStepsAfter(stepPath: LensStep[], stepId: string): string[] {
  const index = stepPath.findIndex((step) => step.id === stepId);
  return index === -1 ? [] : stepPath.slice(index + 1).map((step) => step.id);
}

export function evaluateStepOptions(
  config: LensConfig,
  step: LensStep | null,
  selections: SelectionMap,
  frame: FrameContext
): ComputedOption[] {
  if (!step) {
    return [];
  }

  const group = config.options[step.optionGroup];
  if (!group) {
    return [];
  }

  return evaluateGroupOptions(group, selections, frame);
}

export function evaluateGroupOptions(group: LensOptionGroup, selections: SelectionMap, frame: FrameContext): ComputedOption[] {
  const frameData = getFrameData(frame);

  return group.options.map((option) => {
    const hiddenByCondition = option.showWhen ? !evaluateCondition(option.showWhen, selections, frameData) : false;
    const disabledByCondition = option.disabledWhen ? evaluateCondition(option.disabledWhen, selections, frameData) : false;
    const disabledByFrameRestriction = frame.restrictions.disallowedOptions.includes(option.id);

    return {
      ...option,
      isHidden: hiddenByCondition,
      isDisabled: disabledByCondition || disabledByFrameRestriction,
      disabledReason: disabledByFrameRestriction
        ? 'This option is not available for the selected frame.'
        : disabledByCondition
          ? option.disabledReason
          : undefined,
    };
  });
}

export function clearInvalidSelections(
  currentSelections: SelectionMap,
  config: LensConfig,
  frame: FrameContext
): SelectionMap {
  const nextSelections: SelectionMap = {};
  const visibleSteps = getVisibleSteps(config, currentSelections, frame);
  const validStepIds = new Set(visibleSteps.map((step) => step.id));

  function sanitizeValue(group: LensOptionGroup, value: string | string[] | undefined, validOptions: string[]): string | string[] | undefined {
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => validOptions.includes(item));
      const exclusive = filtered.find((item) => group.options.find((option) => option.id === item)?.exclusive);
      return exclusive ? [exclusive] : filtered.length > 0 ? filtered : undefined;
    }
    return value && validOptions.includes(value) ? value : undefined;
  }

  for (const step of visibleSteps) {
    const value = currentSelections[step.id];
    const validOptions = evaluateStepOptions(config, step, currentSelections, frame)
      .filter((option) => !option.isHidden && !option.isDisabled)
      .map((option) => option.id);
    const sanitized = sanitizeValue(config.options[step.optionGroup], value, validOptions);
    if (sanitized) nextSelections[step.id] = sanitized;
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, value] of Object.entries(currentSelections)) {
      if (validStepIds.has(key) || nextSelections[key] || !config.options[key] || !hasActiveParentSelection(config, key, nextSelections)) {
        continue;
      }
      const validOptions = evaluateGroupOptions(config.options[key], nextSelections, frame)
        .filter((option) => !option.isHidden && !option.isDisabled)
        .map((option) => option.id);
      const validValue = sanitizeValue(config.options[key], value, validOptions);
      if (Array.isArray(validValue) ? validValue.length > 0 : Boolean(validValue)) {
        nextSelections[key] = validValue as string | string[];
        changed = true;
      }
    }
  }

  return nextSelections;
}

export function getChildOptionsGroupForSelection(config: LensConfig, stepId: string, selection: string | string[] | undefined) {
  if (!selection) {
    return undefined;
  }

  const step = config.steps.find((candidate) => candidate.id === stepId);
  const group = step ? config.options[step.optionGroup] : undefined;
  const selectedId = Array.isArray(selection) ? selection[0] : selection;
  const option = group?.options.find((candidate) => candidate.id === selectedId);

  return option?.childOptionsGroup;
}

export function getAvailablePrescriptionMethods(
  config: LensConfig,
  selections: SelectionMap,
  frame: FrameContext
): PrescriptionMethod[] {
  const group = config.options.prescription;
  if (!group) return [];
  return evaluateGroupOptions(group, selections, frame)
    .filter((option) => !option.isHidden && !option.isDisabled && prescriptionMethods.includes(option.id as PrescriptionMethod))
    .map((option) => option.id as PrescriptionMethod);
}

export function isPrescriptionComplete(
  config: LensConfig,
  prescription: PrescriptionState,
  selections: SelectionMap,
  frame: FrameContext,
  attachment: PrescriptionAttachmentMetadata | null = null
): boolean {
  return validatePrescriptionState(prescription, selections, {
    availableMethods: getAvailablePrescriptionMethods(config, selections, frame),
    attachment,
  }).valid;
}

function isGroupSatisfied(
  config: LensConfig,
  groupId: string,
  selectionKey: string,
  selections: SelectionMap,
  prescription: PrescriptionState,
  frame: FrameContext,
  attachment: PrescriptionAttachmentMetadata | null,
  visited: Set<string>
): boolean {
  if (visited.has(groupId)) {
    return false;
  }
  const group = config.options[groupId];
  if (!group) {
    return false;
  }
  if (group.type === 'prescription') {
    return isPrescriptionComplete(config, prescription, selections, frame, attachment);
  }
  const selection = selections[selectionKey];
  const selectedIds = Array.isArray(selection) ? selection : typeof selection === 'string' && selection ? [selection] : [];
  if (group.required && selectedIds.length === 0) {
    return false;
  }
  const selectableOptions = evaluateGroupOptions(group, selections, frame).filter((option) => !option.isHidden && !option.isDisabled);
  const selectedOptions = selectedIds.map((id) => selectableOptions.find((option) => option.id === id));
  if (selectedOptions.some((option) => !option)) {
    return false;
  }
  if (selectedOptions.some((option) => option?.exclusive) && selectedOptions.length > 1) {
    return false;
  }
  const nextVisited = new Set(visited).add(groupId);
  return selectedOptions.every((option) =>
    !option?.childOptionsGroup
    || isGroupSatisfied(config, option.childOptionsGroup, option.childOptionsGroup, selections, prescription, frame, attachment, nextVisited)
  );
}

export function isStepSatisfied(
  config: LensConfig,
  step: LensStep,
  selections: SelectionMap,
  prescription: PrescriptionState,
  frame: FrameContext,
  attachment: PrescriptionAttachmentMetadata | null = null
): boolean {
  const group = config.options[step.optionGroup];
  if (!group) {
    return false;
  }

  return isGroupSatisfied(config, step.optionGroup, step.id, selections, prescription, frame, attachment, new Set());
}

export function isBuilderFlowComplete(
  config: LensConfig,
  selections: SelectionMap,
  prescription: PrescriptionState,
  frame: FrameContext,
  attachment: PrescriptionAttachmentMetadata | null = null
): boolean {
  const steps = getVisibleSteps(config, selections, frame);
  return steps.every((step) => isStepSatisfied(config, step, selections, prescription, frame, attachment));
}

export function calculatePriceBreakdown(
  config: LensConfig,
  stepPath: LensStep[],
  selections: SelectionMap,
  frame: FrameContext
): PriceLineItem[] {
  const visibleStepIds = new Set(stepPath.map((step) => step.id));
  const items: PriceLineItem[] = [];

  for (const [stepId, value] of Object.entries(selections)) {
    if (!visibleStepIds.has(stepId) && (!config.options[stepId] || !hasActiveParentSelection(config, stepId, selections))) {
      continue;
    }

    const group = config.options[stepId] ?? config.options[config.steps.find((step) => step.id === stepId)?.optionGroup ?? ''];
    if (!group) {
      continue;
    }

    const step = config.steps.find((candidate) => candidate.id === stepId) ?? null;
    const computedOptions = evaluateGroupOptions(group, selections, frame);
    const ids = Array.isArray(value) ? value : [value];

    for (const optionId of ids) {
      const option = computedOptions.find((candidate) => candidate.id === optionId && !candidate.isHidden && !candidate.isDisabled);
      if (!option) {
        continue;
      }
      const price = getOptionPrice(option, selections, frame);
      if (price <= 0) {
        continue;
      }

      items.push({
        stepId,
        stepTitle: step?.title ?? group.title,
        optionId: option.id,
        optionTitle: option.title,
        price,
      });
    }
  }

  return items;
}

export function calculateTotal(items: PriceLineItem[], basePrice = 0): number {
  return items.reduce((sum, item) => sum + item.price, basePrice);
}

export function getVisibleSelections(config: LensConfig, selections: SelectionMap, frame: FrameContext): VisibleSelection[] {
  const visibleSelections: VisibleSelection[] = [];

  function appendNestedSelections(groupId: string) {
    const nestedValue = selections[groupId];
    if (!nestedValue || Array.isArray(nestedValue)) {
      return;
    }

    const group = config.options[groupId];
    const option = group?.options.find((candidate) => candidate.id === nestedValue);
    if (!group || !option) {
      return;
    }

    visibleSelections.push({
      stepId: groupId,
      stepTitle: group.title,
      optionTitle: option.title,
    });

    if (option.childOptionsGroup) {
      appendNestedSelections(option.childOptionsGroup);
    }
  }

  for (const step of getVisibleSteps(config, selections, frame)) {
    const selection = selections[step.id];
    if (!selection || Array.isArray(selection)) {
      continue;
    }

    const option = getOptionById(config, step.id, selection);
    if (!option) {
      continue;
    }

    visibleSelections.push({
      stepId: step.id,
      stepTitle: step.title,
      optionTitle: option.title,
    });

    if (option.childOptionsGroup) {
      appendNestedSelections(option.childOptionsGroup);
    }
  }

  return visibleSelections;
}

export function getDisplayPriceForOption(
  _config: LensConfig,
  _stepId: string,
  option: LensOption,
  selections: SelectionMap,
  frame: FrameContext
): number {
  return getOptionPrice(option, selections, frame);
}

function getOptionPrice(option: LensOption, selections: SelectionMap, frame: FrameContext): number {
  const frameData = getFrameData(frame);
  const override = option.priceOverrides?.find((rule) => evaluateCondition(rule.when, selections, frameData));
  const adjustment = option.priceAdjustments
    ?.filter((rule) => evaluateCondition(rule.when, selections, frameData))
    .reduce((total, rule) => total + rule.amount, 0) ?? 0;

  return (override?.price ?? option.price) + adjustment;
}

export function getOptionById(config: LensConfig, stepId: string, optionId: string | undefined): LensOption | undefined {
  if (!optionId) {
    return undefined;
  }

  const step = config.steps.find((candidate) => candidate.id === stepId);
  const group = step ? config.options[step.optionGroup] : config.options[stepId];
  return group?.options.find((candidate) => candidate.id === optionId);
}
