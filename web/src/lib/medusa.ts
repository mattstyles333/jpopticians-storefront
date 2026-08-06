import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { BACKEND_URL, PUBLISHABLE_KEY } from "./env"

/** Shared Medusa store SDK client (works in Node server components and the browser). */
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
})

/**
 * Lightweight store product types.
 *
 * The v2.18 HTTP types for `StoreProductVariant` do not declare `prices`
 * (they are added by query expansion at runtime), so we model the shapes the
 * storefront actually consumes and cast SDK responses to them.
 */
export interface StorePrice {
  amount: number
  currency_code: string
}

export interface StoreVariantLite {
  id: string
  title?: string | null
  sku?: string | null
  prices?: StorePrice[] | null
}

export interface StoreProduct {
  id: string
  title: string
  handle?: string | null
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  images?: Array<{ url: string }> | null
  metadata?: Record<string, unknown> | null
  created_at?: string | Date | null
  variants?: StoreVariantLite[] | null
  options?: Array<{
    id: string
    title: string
    values?: Array<{ value: string }> | null
  }> | null
  categories?: Array<{ id: string; name: string; handle?: string | null }> | null
}

export type StoreCart = HttpTypes.StoreCart
export type StoreLineItem = HttpTypes.StoreCartLineItem
export type StoreOrder = HttpTypes.StoreOrder
export type StoreCategory = HttpTypes.StoreProductCategory
export type StoreShippingOption = HttpTypes.StoreShippingOption
export type StoreCartAddress = HttpTypes.StoreCartAddress

/** Product metadata used for merchandising flags and frame attributes. */
export interface ProductMetadata {
  brand?: string
  is_new?: boolean
  featured?: boolean
  internal?: boolean
  frame_type?: string
  eye_size?: number
  base_curve?: boolean
  supplier_glazing_routes?: string
}

export function productMetadata(product: Pick<StoreProduct, "metadata">): ProductMetadata {
  const raw = product.metadata ?? {}
  return {
    brand: typeof raw.brand === "string" ? raw.brand : undefined,
    is_new: raw.is_new === true || raw.is_new === "true",
    featured: raw.featured === true || raw.featured === "true",
    internal: raw.internal === true || raw.internal === "true",
    frame_type: typeof raw.frame_type === "string" ? raw.frame_type : undefined,
    eye_size: typeof raw.eye_size === "number" ? raw.eye_size : undefined,
    base_curve: raw.base_curve === true || raw.base_curve === "true",
    supplier_glazing_routes:
      typeof raw.supplier_glazing_routes === "string" ? raw.supplier_glazing_routes : undefined,
  }
}

/** GBP price (minor units) for a variant, or null when unpublished. */
export function variantPriceMinor(variant: StoreVariantLite | null | undefined): number | null {
  const price = variant?.prices?.find((p) => p.currency_code === "gbp")
  return typeof price?.amount === "number" ? price.amount : null
}

/** Smallest display price across a product's variants (minor units). */
export function minVariantPrice(product: Pick<StoreProduct, "variants">): number | null {
  const prices = (product.variants ?? [])
    .map((variant) => variantPriceMinor(variant))
    .filter((amount): amount is number => amount !== null)
  return prices.length > 0 ? Math.min(...prices) : null
}
