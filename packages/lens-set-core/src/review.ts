import { evaluateGroupOptions, getVisibleSteps, isStepSatisfied } from './builder';
import { formatSignedValue, sanitizePrescriptionForSelections } from './prescription';
import type {
  FrameContext,
  LensConfig,
  PrescriptionAttachmentMetadata,
  PrescriptionState,
  ReviewSection,
  SelectionMap,
} from './types';

function prescriptionDetails(prescription: PrescriptionState, attachment: PrescriptionAttachmentMetadata | null): string[] {
  if (prescription.method === 'manual') {
    const manual = prescription.manual;
    const right = [
      `SPH ${formatSignedValue(manual.rightSphereSign, manual.rightSphereValue)}`,
      `CYL ${formatSignedValue(manual.rightCylinderSign, manual.rightCylinderValue)}`,
      manual.rightAxis ? `Axis ${manual.rightAxis}` : '',
      manual.rightAddPower ? `ADD +${manual.rightAddPower}` : '',
      manual.rightIntermediateAdd ? `Intermediate +${manual.rightIntermediateAdd}` : '',
    ].filter(Boolean).join(', ');
    const left = [
      `SPH ${formatSignedValue(manual.leftSphereSign, manual.leftSphereValue)}`,
      `CYL ${formatSignedValue(manual.leftCylinderSign, manual.leftCylinderValue)}`,
      manual.leftAxis ? `Axis ${manual.leftAxis}` : '',
      manual.leftAddPower ? `ADD +${manual.leftAddPower}` : '',
      manual.leftIntermediateAdd ? `Intermediate +${manual.leftIntermediateAdd}` : '',
    ].filter(Boolean).join(', ');
    return [
      `Right eye: ${right}`,
      `Left eye: ${left}`,
      ...(manual.rightPrism ? [`Right prism: ${manual.rightPrism}`] : []),
      ...(manual.leftPrism ? [`Left prism: ${manual.leftPrism}`] : []),
      `PD: ${manual.pd} mm`,
    ];
  }
  if (prescription.method === 'upload') {
    return attachment ? [`File: ${attachment.name}`] : ['File must be selected again.'];
  }
  if (prescription.method === 'saved') {
    return [`Reference: ${prescription.savedReference.trim()}`];
  }
  return prescription.method === 'later' ? ['Prescription will be provided after checkout.'] : [];
}

export function buildReviewSections(
  config: LensConfig,
  selections: SelectionMap,
  frame: FrameContext,
  prescription: PrescriptionState,
  attachment: PrescriptionAttachmentMetadata | null
): ReviewSection[] {
  const sections: ReviewSection[] = [];
  const relevantPrescription = sanitizePrescriptionForSelections(prescription, selections);

  function appendGroup(groupId: string, selectionKey: string, editStepId: string, visited: Set<string>) {
    if (visited.has(groupId)) return;
    const group = config.options[groupId];
    if (!group) return;
    const selected = selections[selectionKey];
    const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : [];
    const options = evaluateGroupOptions(group, selections, frame).filter((option) => !option.isHidden && !option.isDisabled);
    const selectedOptions = selectedIds.map((id) => options.find((option) => option.id === id)).filter((option) => option !== undefined);
    sections.push({
      id: `${editStepId}:${groupId}`,
      editStepId,
      title: group.title,
      values: selectedOptions.length > 0 ? selectedOptions.map((option) => option.title) : ['Not selected'],
      details: [],
      complete: !group.required || selectedOptions.length > 0,
    });
    const nextVisited = new Set(visited).add(groupId);
    for (const option of selectedOptions) {
      if (option.childOptionsGroup) appendGroup(option.childOptionsGroup, option.childOptionsGroup, editStepId, nextVisited);
    }
  }

  for (const step of getVisibleSteps(config, selections, frame)) {
    const group = config.options[step.optionGroup];
    if (!group) continue;
    if (group.type === 'prescription') {
      const method = group.options.find((option) => option.id === prescription.method);
      sections.push({
        id: step.id,
        editStepId: step.id,
        title: step.title,
        values: [method?.title ?? 'Not selected'],
        details: prescriptionDetails(relevantPrescription, attachment),
        complete: isStepSatisfied(config, step, selections, relevantPrescription, frame, attachment),
      });
      continue;
    }
    appendGroup(step.optionGroup, step.id, step.id, new Set());
    const rootSection = sections.find((section) => section.id === `${step.id}:${step.optionGroup}`);
    if (rootSection) {
      rootSection.complete = isStepSatisfied(config, step, selections, prescription, frame, attachment);
    }
  }
  return sections;
}
