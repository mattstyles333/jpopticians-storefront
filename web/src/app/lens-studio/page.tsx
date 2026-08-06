import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { LensStudioClient } from "@/components/lens/LensStudioClient"
import { STANDARD_LENS_PRICE_MAJOR } from "@/lib/env"
import { variantPriceMinor } from "@/lib/medusa"
import { normalizeFrameType, type LensStudioFrame } from "@/lib/lens"
import { listProducts } from "@/lib/queries"

export const metadata: Metadata = {
  title: "Lens Studio",
  description:
    "Add prescription lenses to your JPOpticians frame, glazed in our UK lab.",
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LensStudioPage({ searchParams }: PageProps) {
  const params = await searchParams
  const mode = first(params.mode) === "reglaze" ? "reglaze" : "frame"
  const frameSku = first(params.frame_sku)?.trim() ?? ""
  const lensProductSku = first(params.lens_product_sku)?.trim() ?? "LENS-STANDARD"

  const { products } = await listProducts({ limit: 100 })

  // Locate the lens product (e.g. LENS-STANDARD) and the chosen frame variant.
  const lensProduct = products.find((p) =>
    (p.variants ?? []).some((v) => v.sku === lensProductSku)
  )
  const lensVariant = lensProduct?.variants?.find((v) => v.sku === lensProductSku)
  const lensVariantId = lensVariant?.id ?? null
  // The configured standard lens price carries the price (the Medusa lens
  // product itself is priced at 0).
  const lensBasePriceMinor = STANDARD_LENS_PRICE_MAJOR * 100

  const frameProduct = frameSku
    ? products.find((p) => (p.variants ?? []).some((v) => v.sku === frameSku))
    : null
  const frameVariant = frameProduct?.variants?.find((v) => v.sku === frameSku)
  const frameVariantId = frameVariant?.id ?? null

  const frame: LensStudioFrame | null = frameSku
    ? {
        sku: frameSku,
        name:
          first(params.frame_name) ??
          frameVariant?.title
            ? `${frameProduct?.title ?? "Frame"}${frameVariant?.title ? ` - ${frameVariant.title}` : ""}`
            : (frameProduct?.title ?? "Frame"),
        imageUrl: first(params.frame_image) ?? frameProduct?.thumbnail ?? null,
        frameType: normalizeFrameType(first(params.frame_type) ?? "full-rim"),
        framePrice:
          frameVariant && variantPriceMinor(frameVariant) !== null
            ? (variantPriceMinor(frameVariant) as number) / 100
            : first(params.frame_price)
              ? Number(first(params.frame_price)) || null
              : null,
        lensProductSku,
        source: mode,
      }
    : null

  const lensTitle = lensProduct?.title ?? "Prescription lenses"

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-zinc-900">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>Lens Studio</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Lens Studio</h1>
        <p className="mt-2 text-zinc-600">
          {mode === "reglaze"
            ? "Reglaze your existing frames with new prescription lenses."
            : "Pair a JPOpticians frame with single-vision lenses, glazed in our UK lab."}
        </p>
      </header>

      {!frame ? (
        <div className="mt-10">
          {mode === "reglaze" ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
              <h2 className="font-semibold text-zinc-900">Reglaze is coming soon</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                You&apos;ll soon be able to send us your existing frames for new
                lenses. For now, pick a new frame below to configure lenses.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              Choose a frame to start, or browse from a product page.
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products
              .filter((p) => {
                const meta = (p.metadata ?? {}) as Record<string, unknown>
                return meta.internal !== true && meta.internal !== "true"
              })
              .map((product) => (
                <Link
                  key={product.id}
                  href={`/lens-studio?frame_sku=${
                    product.variants?.[0]?.sku ?? ""
                  }&frame_name=${encodeURIComponent(product.title)}&frame_image=${
                    product.thumbnail ?? ""
                  }&frame_type=${encodeURIComponent(
                    String((product.metadata as Record<string, unknown>)?.frame_type ?? "full-rim")
                  )}&lens_product_sku=${lensProductSku}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-zinc-100">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-zinc-900">{product.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">Configure lenses →</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <LensStudioClient
            frame={frame}
            frameVariantId={frameVariantId}
            lensVariantId={lensVariantId}
            lensBasePriceMinor={lensBasePriceMinor}
            lensTitle={lensTitle}
          />
        </div>
      )}

      {!frame && products.length === 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-zinc-400"
            >
              Frames loading…
            </div>
          ))}
        </div>
      )}

      {frame && !frameVariantId && (
        <p className="mt-4 text-sm text-amber-700">
          This frame variant isn&apos;t purchasable yet; you can still preview
          the configuration.
        </p>
      )}
    </div>
  )
}
