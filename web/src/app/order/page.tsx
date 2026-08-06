"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { formatDate, formatMoney } from "@/lib/format"
import { sdk } from "@/lib/medusa"
import type { StoreOrder } from "@/lib/medusa"

function OrderContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [order, setOrder] = useState<StoreOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    sdk.store.order
      .retrieve(id, {
        fields:
          "id,display_id,email,total,currency_code,status,payment_status,created_at," +
          "items.id,items.title,items.subtitle,items.quantity,items.unit_price,items.metadata," +
          "shipping_address.first_name,shipping_address.last_name,shipping_address.address_1," +
          "shipping_address.city,shipping_address.postal_code",
      })
      .then((res) => setOrder(res.order as unknown as StoreOrder))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <p className="text-sm text-zinc-500">Loading order...</p>
      </div>
    )
  }

  if (!id || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Order not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          We could not find an order with that ID.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-zinc-900 px-7 text-sm font-semibold text-white"
        >
          Browse products
        </Link>
      </div>
    )
  }

  const total = order.total ?? 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Order confirmed
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          Thank you, {order.shipping_address?.first_name ?? "there"}.
        </h1>
        <p className="mt-3 text-sm text-zinc-700">
          Order {order.display_id ? `#${order.display_id} ` : ""}has been received
          {order.email ? ` and a confirmation is on its way to ${order.email}` : ""}.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Placed {formatDate(order.created_at)} ·{" "}
          <span className="capitalize">{order.status}</span> payment
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200">
        <ul className="divide-y divide-zinc-100">
          {order.items?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-medium text-zinc-900">{item.title}</p>
                {item.subtitle && <p className="text-sm text-zinc-500">{item.subtitle}</p>}
                <p className="text-xs text-zinc-400">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold text-zinc-900">
                {formatMoney((item.unit_price ?? 0) * (item.quantity ?? 1))}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-zinc-200 p-5">
          <dl className="flex justify-between">
            <dt className="font-semibold text-zinc-900">Total (incl. VAT)</dt>
            <dd className="text-lg font-semibold text-zinc-900">{formatMoney(total)}</dd>
          </dl>
        </div>
      </section>

      {order.shipping_address && (
        <section className="mt-6 rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Delivering to
          </h2>
          <p className="mt-2 text-sm text-zinc-900">
            {order.shipping_address.first_name} {order.shipping_address.last_name}
            <br />
            {order.shipping_address.address_1}
            {order.shipping_address.city ? <><br />{order.shipping_address.city}</> : null}
            {order.shipping_address.postal_code ? <> {order.shipping_address.postal_code}</> : null}
          </p>
        </section>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-7 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-14 text-center"><p className="text-sm text-zinc-500">Loading...</p></div>}>
      <OrderContent />
    </Suspense>
  )
}