import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PdpActions } from "@/components/PdpActions"
import { ProductCard } from "@/components/ProductCard"
import { productMetadata } from "@/lib/medusa"
import { getProductByHandle, listProducts, listRelatedProducts } from "@/lib/queries"

interface PageProps {
  params: Promise<{ handle: string }>
}

/** Pre-render all product pages for static export. */
export async function generateStaticParams() {
  const { products } = await listProducts({ limit: 200 })
  return (products ?? []).map((p) => ({ handle: p.handle ?? p.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  return {
    title: product ? product.title : "Product",
    description: product?.description ?? undefined,
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) notFound()

  const meta = productMetadata(product)
  const [related] = await Promise.all([listRelatedProducts(product, 4)])

  const facts = [
    meta.brand ? ["Brand", meta.brand] : null,
    meta.frame_type ? ["Frame type", meta.frame_type.replace("-", " ")] : null,
    meta.eye_size ? ["Eye size", `${meta.eye_size} mm`] : null,
    meta.base_curve ? ["Base curve", "Yes"] : null,
  ].filter((entry): entry is [string, string] => entry !== null)

  const image = product.thumbnail

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-zinc-900">
          Glasses
        </Link>
        {product.categories?.[0] && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/products?category=${product.categories[0].handle}`}
              className="hover:text-zinc-900"
            >
              {product.categories[0].name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-100">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              No image
            </div>
          )}
          {meta.is_new && (
            <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              New
            </span>
          )}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {meta.brand ?? "JPOpticians"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.title}</h1>
          <div className="mt-6">
            <PdpActions product={product} />
          </div>

          {product.description && (
            <div className="mt-8 border-t border-zinc-200 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Description
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
                {product.description}
              </p>
            </div>
          )}

          {facts.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-zinc-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
