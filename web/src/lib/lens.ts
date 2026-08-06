import {
  buildLensCustomizationDraft,
  defaultPrescriptionState,
  type FrameContext,
  type LensConfig,
  type LensCustomizationDraft,
  type PrescriptionState,
  type SelectionMap,
} from "@jpop/lens-set-core"

import { majorToMinor } from "./format"

export type FrameType = "full-rim" | "semi-rimless" | "rimless" | "wrap"

export interface LensStudioFrame {
  sku: string
  name: string
  imageUrl: string | null
  frameType: FrameType
  framePrice: number | null
  lensProductSku: string
  source: "frame" | "reglaze"
}

export function normalizeFrameType(value: string): FrameType {
  if (value === "semi-rimless" || value === "rimless" || value === "wrap") {
    return value
  }
  return "full-rim"
}

/**
 * Builds the minimal lens configuration that drives the JPOpticians lens
 * studio. The full option matrix (varifocals, tints, supplier glazing) is
 * produced by the Spex4Less pricing engine once its data bridge is
 * configured; until then the studio sells the standard single-vision lens
 * product at its Medusa catalogue price.
 */
export function buildStudioLensConfig(lensBasePriceMajor: number): LensConfig {
  return {
    version: "v1",
    currency: { symbol: "£", code: "GBP" },
    basePrice: lensBasePriceMajor,
    steps: [
      {
        id: "lens-type",
        title: "Lens type",
        optionGroup: "lens-type",
        autoAdvance: false,
      },
    ],
    options: {
      "lens-type": {
        title: "Lens type",
        required: true,
        type: "radio",
        magentoCode: "lens_type",
        options: [
          {
            id: "single-vision",
            title: "Single vision",
            price: 0,
            magentoCode: "single_vision",
            description: "Standard single-vision lenses, glazed in our UK lab.",
          },
        ],
      },
    },
  }
}

/** Maps the form fields into a lens-set-core prescription state. */
export function buildPrescriptionState(input: {
  rightSphere: string
  rightCylinder: string
  rightAxis: string
  leftSphere: string
  leftCylinder: string
  leftAxis: string
  pd: string
}): PrescriptionState {
  return {
    ...structuredClone(defaultPrescriptionState),
    method: "manual",
    manual: {
      rightSphereSign: input.rightSphere.startsWith("-") ? "-" : "+",
      rightSphereValue: input.rightSphere.replace(/^[+-]/, ""),
      rightCylinderSign: input.rightCylinder.startsWith("-") ? "-" : "+",
      rightCylinderValue: input.rightCylinder.replace(/^[+-]/, ""),
      rightAxis: input.rightAxis,
      leftSphereSign: input.leftSphere.startsWith("-") ? "-" : "+",
      leftSphereValue: input.leftSphere.replace(/^[+-]/, ""),
      leftCylinderSign: input.leftCylinder.startsWith("-") ? "-" : "+",
      leftCylinderValue: input.leftCylinder.replace(/^[+-]/, ""),
      leftAxis: input.leftAxis,
      rightAddPower: "",
      leftAddPower: "",
      rightIntermediateAdd: "",
      leftIntermediateAdd: "",
      rightPrism: "",
      leftPrism: "",
      pd: input.pd,
    },
  }
}

export interface StudioSelection {
  lensType: "single-vision"
}

export function buildStudioDraft(input: {
  frame: FrameContext
  selections: SelectionMap
  prescription: PrescriptionState | null
  lensBasePriceMajor: number
  termsAccepted: boolean
}): LensCustomizationDraft {
  const { frame, selections, prescription, lensBasePriceMajor } = input
  return buildLensCustomizationDraft(
    {
      quoteId: null,
      termsAccepted: input.termsAccepted,
      frame,
      selections,
      reglazeFrameDescription: "",
      prescription: prescription ?? structuredClone(defaultPrescriptionState),
      priceItems: [
        {
          stepId: "lens-type",
          stepTitle: "Lens type",
          optionId: "single-vision",
          optionTitle: "Single vision lenses",
          price: lensBasePriceMajor,
        },
      ],
      totalPrice: lensBasePriceMajor,
    },
    buildStudioLensConfig(lensBasePriceMajor)
  )
}

export function toFrameContext(frame: LensStudioFrame): FrameContext {
  return {
    frameSku: frame.sku,
    frameName: frame.name,
    frameType: frame.frameType,
    framePrice: frame.framePrice,
    frameImageUrl: frame.imageUrl,
    baseCurve: false,
    eyeSize: null,
    lensProductSku: frame.lensProductSku,
    source: frame.source,
    supplierGlazingRoutes: [],
    brandedLensRoute: "standard",
    restrictions: { disallowedOptions: [], notes: [] },
  }
}

export { majorToMinor }
