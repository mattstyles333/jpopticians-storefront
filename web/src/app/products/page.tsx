"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { ProductCard } from "@/components/ProductCard"
import { formatMoney } from "@/lib/format"
import { minVariantPrice } from "@/lib/medusa"
import type { StoreProduct, StoreCategory } from "@/lib/medusa"
import {
  getCategoryByHandle,
  listCategories,
  listProducts,
  sortProducts,
  type SortKey,
} from "@/lib/queries"

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Alphabetical" },
]

function ProductsContent() {
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const q = searchParams.get("q")?.trim() ?? ""
  const categoryHandle = searchParams.get("category") ?? ""
  const sort = (searchParams.get("sort") ?? "featured") as SortKey

  useEffect(() => {
    async function load() {
      const [cats, activeCategory] = await Promise.all([
        listCategories(),
        categoryHandle ? getCategoryByHandle(categoryHandle) : Promise.resolve(null),
      ])
      setCategories(cats)

      const result = await listProducts({
        q: q || undefined,
        categoryId: activeCategory?.id,
        limit: 100,
      })
      setProducts(result.products)
      setCount(result.count)
      setLoading(false)
    }
    load()
  }, [q, categoryHandle])

  const sorted = sortProducts(products, sort)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {categoryHandle
              ? categories.find((c) => c.handle === categoryHandle)?.name ?? "Category"
              : q
                ? `Results for "${q}"`
                : "Glasses"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {loading ? "Loading..." : `${count} product${count === 1 ? "" : "s"}`}
            {categoryHandle ? ` in ${categories.find((c) => c.handle === categoryHandle)?.name ?? ""}` : ""}
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
        {loading ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
            <p className="font-medium text-zinc-900">Loading products...</p>
          </div>
        ) : sorted.length === 0 ? (
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
      {sorted.length > 0 && (
        <p className="sr-only">
          Prices shown from{" "}
          {formatMoney(Math.min(...sorted.map((p) => minVariantPrice(p) ?? 0)))}.
        </p>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-center"><p className="text-sm text-zinc-500">Loading...</p></div>}>
      <ProductsContent />
    </Suspense>
  )
}