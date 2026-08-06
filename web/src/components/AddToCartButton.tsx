"use client"

import { useState } from "react"

import { useCart } from "@/lib/cart"

export function AddToCartButton({ variantId, label = "Add to cart" }: { variantId: string; label?: string }) {
  const { addToCart, loading } = useCart()
  const [added, setAdded] = useState(false)

  async function handleClick() {
    await addToCart(variantId)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {added ? "Added ✓" : loading ? "Adding…" : label}
    </button>
  )
}
