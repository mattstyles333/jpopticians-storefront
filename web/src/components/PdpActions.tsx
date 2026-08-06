"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { AddToCartButton } from "@/components/AddToCartButton"
import { formatMoney } from "@/lib/format"
import { variantPriceMinor } from "@/lib/medusa"
import type { StoreProduct } from "@/lib/medusa"

interface PdpActionsProps {
  product: StoreProduct
}

export function PdpActions({ product }: PdpActionsProps) {
  const variants = useMemo(() => product.variants ?? [], [product.variants])
  const option = product.options?.[0]
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  )

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null,
    [variants, selectedVariantId]
  )
  const price = variantPriceMinor(selectedVariant)

  const lensStudioHref = useMemo(() => {
    if (!selectedVariant) return "/lens-studio"
    const params = new URLSearchParams({
      frame_sku: selectedVariant.sku ?? product.handle ?? "",
      frame_name: `${product.title}${selectedVariant.title ? ` - ${selectedVariant.title}` : ""}`,
      frame_image: product.thumbnail ?? "",
      frame_type: (product.metadata as Record<string, unknown>)?.frame_type as string ?? "full-rim",
      frame_price: price !== null ? String(price / 100) : "",
      lens_product_sku: "LENS-STANDARD",
    })
    return `/lens-studio?${params.toString()}`
  }, [product, selectedVariant, price])

  return (
    <div className="space-y-5">
      {option && variants.length > 1 && (
        <div>
          <p className="text-sm font-medium text-zinc-900">{option.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const active = variant.id === selectedVariant?.id
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  aria-pressed={active}
                  className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                    active
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-emerald-600"
                  }`}
                >
                  {variant.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-semibold text-zinc-900">
          {price !== null ? formatMoney(price) : "Price on request"}
        </p>
        {selectedVariant?.sku && (
          <p className="text-sm text-zinc-500">SKU {selectedVariant.sku}</p>
        )}
      </div>

      {selectedVariant && (
        <AddToCartButton variantId={selectedVariant.id} label="Add frame to cart" />
      )}

      <Link
        href={lensStudioHref}
        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-semibold text-zinc-900 transition-colors hover:border-emerald-600 hover:text-emerald-700 sm:w-auto"
      >
        Add with prescription lenses
      </Link>

      <p className="text-xs text-zinc-500">
        All prices include UK VAT. Prescription lenses are glazed in our UK lab
        and dispatched with your frame.
      </p>
    </div>
  )
}
