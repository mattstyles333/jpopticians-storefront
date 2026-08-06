"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"

import { REGION_ID } from "./env"
import { sdk } from "./medusa"
import type { StoreCart } from "./medusa"

const CART_KEY = "jpopt.cartId"

interface CartContextValue {
  cartId: string | null
  cart: StoreCart | null
  itemCount: number
  subtotal: number
  loading: boolean
  error: string | null
  addToCart: (variantId: string, quantity?: number) => Promise<void>
  addLensSetToCart: (frameVariantId: string, lensVariantId: string, lensConfigId: string) => Promise<void>
  updateQuantity: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  refresh: () => Promise<void>
  clearError: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const CART_FIELDS =
  "id,email,region_id,currency_code,items.id,items.variant_id,items.title,items.subtitle," +
  "items.thumbnail,items.quantity,items.unit_price,items.total,items.metadata," +
  "shipping_methods.id,shipping_methods.name,shipping_methods.amount," +
  "total,item_total,shipping_total,tax_total"

function readStoredCartId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(CART_KEY)
  } catch {
    return null
  }
}

function writeStoredCartId(id: string | null) {
  if (typeof window === "undefined") return
  try {
    if (id) {
      window.localStorage.setItem(CART_KEY, id)
    } else {
      window.localStorage.removeItem(CART_KEY)
    }
  } catch {
    // storage unavailable (private mode); cart works for this session only
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null)
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const id = readStoredCartId()
    if (!id) {
      setCart(null)
      setCartId(null)
      return
    }
    try {
      const { cart: fresh } = await sdk.store.cart.retrieve(id, { fields: CART_FIELDS })
      setCart(fresh)
      setCartId(id)
      if (fresh.items?.length === 0) {
        // keep the cart id around so checkout can reuse it
      }
    } catch {
      writeStoredCartId(null)
      setCart(null)
      setCartId(null)
    }
  }, [])

  useEffect(() => {
    // Hydrate the cart from localStorage on mount; the state updates happen
    // after the async SDK round-trip, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const ensureCart = useCallback(async (): Promise<string> => {
    let id = readStoredCartId()
    if (id) return id
    const { cart: created } = await sdk.store.cart.create({
      region_id: REGION_ID || undefined,
    })
    id = created.id
    writeStoredCartId(id)
    setCartId(id)
    return id
  }, [])

  const addToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      setError(null)
      setLoading(true)
      try {
        const id = await ensureCart()
        await sdk.store.cart.createLineItem(id, { variant_id: variantId, quantity })
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add item to cart")
      } finally {
        setLoading(false)
      }
    },
    [ensureCart, refresh]
  )

  const addLensSetToCart = useCallback(
    async (frameVariantId: string, lensVariantId: string, lensConfigId: string) => {
      setError(null)
      setLoading(true)
      try {
        const id = await ensureCart()
        const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/store/carts/${id}/lens-items`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-publishable-api-key": process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? "",
          },
          body: JSON.stringify({
            frame_variant_id: frameVariantId,
            lens_variant_id: lensVariantId,
            lens_config_id: lensConfigId,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message ?? "Could not add lenses to cart")
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add lenses to cart")
      } finally {
        setLoading(false)
      }
    },
    [ensureCart, refresh]
  )

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      const id = readStoredCartId()
      if (!id) return
      setError(null)
      try {
        if (quantity <= 0) {
          await sdk.store.cart.deleteLineItem(id, lineId)
        } else {
          await sdk.store.cart.updateLineItem(id, lineId, { quantity })
        }
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update cart")
      }
    },
    [refresh]
  )

  const removeItem = useCallback(
    async (lineId: string) => {
      const id = readStoredCartId()
      if (!id) return
      setError(null)
      try {
        await sdk.store.cart.deleteLineItem(id, lineId)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove item")
      }
    },
    [refresh]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      cartId,
      cart,
      itemCount: (cart?.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      subtotal: cart?.item_total ?? cart?.total ?? 0,
      loading,
      error,
      addToCart,
      addLensSetToCart,
      updateQuantity,
      removeItem,
      refresh,
      clearError: () => setError(null),
    }),
    [cartId, cart, loading, error, addToCart, addLensSetToCart, updateQuantity, removeItem, refresh]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}
