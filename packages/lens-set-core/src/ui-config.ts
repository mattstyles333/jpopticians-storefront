export const contactConfig = {
  phoneNumber: '0151 632 6611',
  email: 'info@spex4less.com',
  liveChatLabel: 'Live chat',
  officeHours: {
    weekdays: [1, 2, 3, 4, 5],
    startHour: 9,
    endHour: 17,
  },
};

export interface StepGuide {
  question: string;
  helper: string;
  summary?: string;
  optionDescriptions?: Record<string, string>;
}

export const stepGuides: Record<string, StepGuide> = {
  'glazing-route': {
    question: 'Would you prefer official branded lenses or our Spex4Less lab?',
    helper: 'Official supplier lenses include brand engraving and a fixed supplier menu. Spex4Less in-house glazing usually gives more choice and better value.',
  },
  'frame-type': {
    question: 'What kind of frame are these lenses going into?',
    helper: 'Choose the frame style first so we can apply any extra charges and only show compatible lens options.',
  },
  'use-case': {
    question: 'What type of lenses do you need?',
    helper: 'Choose by how the glasses will be used. We will show the right lens designs and prescription fields next.',
  },
  'lens-design': {
    question: 'Which lens level fits this order?',
    helper: 'Choose the lens design that best matches the prescription and how the glasses will be used.',
  },
  'maui-jim-vision-type': {
    question: 'Which Maui Jim prescription sun lens type do you need?',
    helper: 'Choose the actual use: distance, reading, or varifocal. Reading and varifocal orders need ADD values on the prescription.',
  },
  'maui-jim-lens-material': {
    question: 'Choose the Maui Jim lens material',
    helper: 'Each price is for the official supplier lens option, including the selected Maui Jim material.',
  },
  'maui-jim-lens-colour': {
    question: 'Choose the Maui Jim lens colour',
    helper: 'Available finishes follow the selected material: Bi-Gradient for all materials, MauiGradient for Evolution and Brilliant, and solid mirrors for MauiBrilliant.',
  },
  'luxottica-vision-type': {
    question: 'Which official branded lens type do you need?',
    helper: 'Choose the actual use: distance, reading, or varifocal. Bifocal and occupational options stay on the Spex4Less lab route.',
  },
  'luxottica-lens-option': {
    question: 'Choose the official branded lens option',
    helper: 'Ray-Ban polarisation is chosen with the tint colour. Oakley sun lenses retain their supplier finish options. Coating and index are included.',
  },
  'luxottica-lens-colour': {
    question: 'Which official sunglass tint would you prefer?',
    helper: 'Solid and reflective swatches show the supplied lens finish. Ray-Ban polarised tints add £50.',
  },
  prism: {
    question: 'Does the prescription include prism?',
    helper: 'Prism processing adds £30. Select yes whenever prism appears anywhere on the prescription.',
  },
  prescription: {
    question: 'Add the prescription details',
    helper: 'Manual entry is preferred, but the flow still supports upload, saved reference, or send later.',
    summary: 'Prescription capture is skipped automatically for non-prescription orders.',
  },
  tint: {
    question: 'Do you need any tint or light-reactive treatment?',
    helper: 'Choose the tint family first, then select any required colour or sub-type.',
  },
  package: {
    question: 'Which package should wrap this lens order?',
    helper: 'Use a standard package or switch to custom for separate index and coating selections.',
  },
  'custom-index': {
    question: 'How thin should the lenses be?',
    helper: 'Choose a thinner lens when the prescription or frame would benefit from a slimmer finish.',
  },
  'custom-coatings': {
    question: 'Which coatings should be attached?',
    helper: 'Select the coatings you would like us to apply to your lenses.',
  },
};

function isDevelopment(): boolean {
  try {
    return typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

export const debugConfig = {
  showDebugPanel: isDevelopment(),
};
