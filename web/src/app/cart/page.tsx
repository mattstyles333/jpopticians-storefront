"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"

import { useCart } from "@/lib/cart"
import { formatMoney } from "@/lib/format"

export default function CartPage() {
  const { cart, itemCount, subtotal, updateQuantity, removeItem, refresh, loading, error, clearError } =
    useCart()

  useEffect(() => {
    void refresh()
  }, [refresh])

  const items = cart?.items ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={clearError} className="font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-16 text-center">
          <p className="font-medium text-zinc-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-zinc-600">
            Browse the collection and find your next pair.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Shop glasses
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-4 rounded-2xl border border-zinc-200 p-4"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title ?? "Item"}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900">{item.title}</p>
                      <p className="text-sm text-zinc-500">
                        {item.subtitle ?? item.variant?.title ?? ""}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm text-zinc-500 underline-offset-2 hover:text-red-700 hover:underline"
                      aria-label={`Remove ${item.title}`}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center rounded-full border border-zinc-300">
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity ?? 1) - 1)}
                        className="h-8 w-8 text-zinc-600 hover:text-zinc-900"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, (item.quantity ?? 1) + 1)}
                        className="h-8 w-8 text-zinc-600 hover:text-zinc-900"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-semibold text-zinc-900">
                      {formatMoney((item.unit_price ?? 0) * (item.quantity ?? 1))}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-zinc-200 p-6">
            <h2 className="font-semibold text-zinc-900">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Items ({itemCount})</dt>
                <dd className="font-medium text-zinc-900">{formatMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Shipping</dt>
                <dd className="text-zinc-900">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(subtotal)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {loading ? "Loading…" : "Checkout"}
            </Link>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Prices include UK VAT.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
