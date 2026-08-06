import Link from "next/link"

import { ProductCard } from "@/components/ProductCard"
import { listCategories, listFeatured, listNewIn } from "@/lib/queries"

export default async function HomePage() {
  const [featured, newIn, categories] = await Promise.all([
    listFeatured(8),
    listNewIn(8),
    listCategories(),
  ])

  const shopCategories = categories
    .filter((c) => c.handle !== "internal")
    .slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:py-28 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
              UK lab glazing
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Glasses you&apos;ll actually wear.
            </h1>
            <p className="mt-4 max-w-md text-lg text-zinc-300">
              Optical, sunglasses and sports frames with prescription lenses
              crafted in our UK lab. Prices include VAT.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-full bg-emerald-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Shop glasses
              </Link>
              <Link
                href="/lens-studio"
                className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Configure lenses
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-emerald-900 via-zinc-900 to-zinc-950 p-8 ring-1 ring-white/10">
              <p className="text-sm text-zinc-400">Frame of the moment</p>
              {featured[0] ? (
                <Link href={`/products/${featured[0].handle}`} className="group block">
                  <h2 className="mt-2 text-2xl font-semibold group-hover:text-emerald-300">
                    {featured[0].title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                    {featured[0].description}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-emerald-400">View frame →</p>
                </Link>
              ) : (
                <p className="mt-2 text-zinc-400">Featured frames landing soon.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      {shopCategories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Shop by category</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {shopCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.handle}`}
                className="flex h-32 items-end rounded-2xl border border-zinc-200 bg-zinc-50 p-5 transition-colors hover:border-emerald-600 hover:bg-emerald-50"
              >
                <span className="font-medium text-zinc-900">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
            <Link href="/products" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              View all
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* New in */}
      {newIn.length > 0 && (
        <section className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">New in</h2>
              <Link href="/products?sort=newest" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                View all
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {newIn.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Value props */}
      <section className="border-t border-zinc-200">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
          {[
            { title: "UK lab glazing", body: "Lenses fitted by our own opticians." },
            { title: "Free returns", body: "30 days to make sure they suit you." },
            { title: "Prices include VAT", body: "No surprises at the checkout." },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
