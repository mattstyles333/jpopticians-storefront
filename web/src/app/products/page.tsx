import type { Metadata } from "next"
import Link from "next/link"

import { ProductCard } from "@/components/ProductCard"
import { formatMoney } from "@/lib/format"
import { minVariantPrice } from "@/lib/medusa"
import {
  getCategoryByHandle,
  listCategories,
  listProducts,
  sortProducts,
  type SortKey,
} from "@/lib/queries"

export const metadata: Metadata = {
  title: "Glasses",
  description: "Browse optical, sunglasses and sports frames at JPOpticians.",
}

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Alphabetical" },
]

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = first(params.q)?.trim() ?? ""
  const categoryHandle = first(params.category) ?? ""
  const sort = (first(params.sort) ?? "featured") as SortKey

  const [categories, activeCategory] = await Promise.all([
    listCategories(),
    categoryHandle ? getCategoryByHandle(categoryHandle) : Promise.resolve(null),
  ])

  const { products, count } = await listProducts({
    q: q || undefined,
    categoryId: activeCategory?.id,
    limit: 100,
  })

  const sorted = sortProducts(products, sort)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {activeCategory ? activeCategory.name : q ? `Results for "${q}"` : "Glasses"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {count} product{count === 1 ? "" : "s"}
            {activeCategory ? ` in ${activeCategory.name}` : ""}
          </p>
        </div>

        <form method="get" action="/products" className="flex items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {categoryHandle && <input type="hidden" name="category" value={categoryHandle} />}
          <label htmlFor="sort" className="text-sm text-zinc-600">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="h-9 rounded-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Apply
          </button>
        </form>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* Category filter */}
        <aside>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Categories
          </h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link
                href={q ? `/products?q=${encodeURIComponent(q)}` : "/products"}
                className={`block rounded-lg px-3 py-1.5 text-sm ${
                  !categoryHandle ? "bg-emerald-50 font-medium text-emerald-800" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                All
              </Link>
            </li>
            {categories
              .filter((c) => c.handle !== "internal")
              .map((category) => {
                const href = q
                  ? `/products?q=${encodeURIComponent(q)}&category=${category.handle}`
                  : `/products?category=${category.handle}`
                const active = category.handle === categoryHandle
                return (
                  <li key={category.id}>
                    <Link
                      href={href}
                      className={`block rounded-lg px-3 py-1.5 text-sm ${
                        active
                          ? "bg-emerald-50 font-medium text-emerald-800"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                )
              })}
          </ul>
        </aside>

        {/* Grid */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
            <p className="font-medium text-zinc-900">No products found</p>
            <p className="mt-1 text-sm text-zinc-600">
              Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {sorted.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Price summary helper for screen readers */}
      <p className="sr-only">
        Prices shown from{" "}
        {formatMoney(Math.min(...sorted.map((p) => minVariantPrice(p) ?? 0)))}.
      </p>
    </div>
  )
}
