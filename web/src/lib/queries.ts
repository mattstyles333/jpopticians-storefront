import { cache } from "react"

import { REGION_ID } from "./env"
import { minVariantPrice, sdk } from "./medusa"
import type { StoreCategory, StoreProduct } from "./medusa"
const PRODUCT_FIELDS =
  "id,title,handle,subtitle,description,thumbnail,images.url,metadata,created_at," +
  "variants.id,variants.title,variants.sku,variants.prices.amount,variants.prices.currency_code," +
  "options.id,options.title,options.values.value," +
  "categories.id,categories.name,categories.handle"

export interface ProductListOptions {
  q?: string
  categoryId?: string
  limit?: number
  offset?: number
}

/** Server-side product list helper. Returns public, non-internal products. */
export const listProducts = cache(async (opts: ProductListOptions = {}) => {
  const { products, count } = (await sdk.store.product.list({
    fields: PRODUCT_FIELDS,
    limit: opts.limit ?? 100,
    offset: opts.offset ?? 0,
    ...(opts.q ? { q: opts.q } : {}),
    ...(opts.categoryId ? { category_id: [opts.categoryId] } : {}),
  })) as unknown as { products: StoreProduct[]; count: number }
  const visible = products.filter((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>
    return meta.internal !== true && meta.internal !== "true"
  })
  return { products: visible, count }
})

export const getProductByHandle = cache(async (handle: string) => {
  const { products } = (await sdk.store.product.list({
    fields: PRODUCT_FIELDS,
    handle: [handle],
    limit: 1,
  })) as unknown as { products: StoreProduct[] }
  return products[0] ?? null
})

export const getProductById = cache(async (id: string) => {
  const { product } = (await sdk.store.product.retrieve(id, {
    fields: PRODUCT_FIELDS,
  })) as unknown as { product: StoreProduct }
  return product
})

export const listCategories = cache(async (): Promise<StoreCategory[]> => {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,parent_category_id",
    limit: 100,
  })
  return product_categories
})

export const getCategoryByHandle = cache(async (handle: string) => {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,parent_category_id",
    handle: [handle],
    limit: 1,
  })
  return product_categories[0] ?? null
})

/** Products sorted for merchandising: featured first, then newest. */
export const listFeaturedProducts = cache(async (limit = 8) => {
  const { products } = await listProducts({ limit: 100 })
  const scored = products
    .map((product) => {
      const meta = (product.metadata ?? {}) as Record<string, unknown>
      const featured = meta.featured === true || meta.featured === "true"
      const isNew = meta.is_new === true || meta.is_new === "true"
      const created = new Date(product.created_at ?? 0).getTime()
      return { product, featured, isNew, created }
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1
      return b.created - a.created
    })
  return scored.slice(0, limit).map(({ product }) => product)
})

/** Products flagged `featured` (homepage merchandising row). */
export const listFeatured = cache(async (limit = 8) => {
  const all = await listFeaturedProducts(limit)
  return all.filter((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>
    return meta.featured === true || meta.featured === "true"
  })
})

/** Products flagged `is_new` (homepage merchandising row). */
export const listNewIn = cache(async (limit = 8) => {
  const all = await listFeaturedProducts(limit)
  return all.filter((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>
    return meta.is_new === true || meta.is_new === "true"
  })
})

/** Related products sharing a category (excluding self). */
export const listRelatedProducts = cache(async (product: StoreProduct, limit = 4) => {
  const category = product.categories?.[0]
  if (!category) return []
  const { products } = await listProducts({ categoryId: category.id, limit })
  return products.filter((p) => p.id !== product.id)
})

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "title"

export function sortProducts(products: StoreProduct[], sort: SortKey): StoreProduct[] {
  const sorted = [...products]
  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
    case "price-asc":
      return sorted.sort(
        (a, b) => (minVariantPrice(a) ?? Infinity) - (minVariantPrice(b) ?? Infinity)
      )
    case "price-desc":
      return sorted.sort(
        (a, b) => (minVariantPrice(b) ?? -Infinity) - (minVariantPrice(a) ?? -Infinity)
      )
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case "featured":
    default:
      return sorted.sort((a, b) => {
        const metaA = (a.metadata ?? {}) as Record<string, unknown>
        const metaB = (b.metadata ?? {}) as Record<string, unknown>
        const fa = metaA.featured === true || metaA.featured === "true" ? 1 : 0
        const fb = metaB.featured === true || metaB.featured === "true" ? 1 : 0
        if (fa !== fb) return fb - fa
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
  }
}

export const getRegion = cache(async () => {
  if (!REGION_ID) return null
  const { region } = await sdk.store.region.retrieve(REGION_ID)
  return region
})
