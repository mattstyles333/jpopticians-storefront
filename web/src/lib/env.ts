/** Client-visible environment configuration. All values are public by design. */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? ""

export const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID ?? ""

export const DEFAULT_COUNTRY_CODE = "gb"

/**
 * Standard single-vision lens price in major GBP units (e.g. 99 = £99).
 * The Medusa lens product is priced at 0 because the configured lens price
 * is carried by the lens configuration (display_total). This value must
 * match the current glazing price list until the pricing engine bridge is
 * wired up.
 */
export const STANDARD_LENS_PRICE_MAJOR = Number(
  process.env.NEXT_PUBLIC_STANDARD_LENS_PRICE ?? "99"
)
