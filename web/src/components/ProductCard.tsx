import Image from "next/image"
import Link from "next/link"

import { formatMoney } from "@/lib/format"
import { minVariantPrice, productMetadata } from "@/lib/medusa"
import type { StoreProduct } from "@/lib/medusa"

export function ProductCard({ product }: { product: StoreProduct }) {
  const meta = productMetadata(product)
  const price = minVariantPrice(product)
  const isNew = meta.is_new
  const frameType = meta.frame_type ? meta.frame_type.replace("-", " ") : null

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            No image
          </div>
        )}
        {isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            New
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {meta.brand ?? "JPOpticians"}
          {frameType ? ` · ${frameType}` : ""}
        </p>
        <h3 className="font-medium text-zinc-900">{product.title}</h3>
        <p className="mt-auto pt-2 text-sm font-semibold text-zinc-900">
          {price !== null ? formatMoney(price) : "Price on request"}
        </p>
      </div>
    </Link>
  )
}
