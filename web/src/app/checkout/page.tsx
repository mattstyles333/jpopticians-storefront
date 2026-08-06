"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { useCart } from "@/lib/cart"
import { DEFAULT_COUNTRY_CODE } from "@/lib/env"
import { formatMoney } from "@/lib/format"
import { sdk } from "@/lib/medusa"

interface ShippingOptionLite {
  id: string
  name: string
  amount?: number | null
}

interface AddressForm {
  email: string
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
}

const EMPTY_ADDRESS: AddressForm = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: DEFAULT_COUNTRY_CODE,
}

function toAddressPayload(form: AddressForm) {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone || undefined,
    address_1: form.address_1,
    address_2: form.address_2 || undefined,
    city: form.city,
    province: form.province || undefined,
    postal_code: form.postal_code,
    country_code: form.country_code,
  }
}

function validateAddress(form: AddressForm): string | null {
  if (!form.email.includes("@")) return "Enter a valid email address"
  if (!form.first_name.trim()) return "First name is required"
  if (!form.last_name.trim()) return "Last name is required"
  if (!form.address_1.trim()) return "Address line 1 is required"
  if (!form.city.trim()) return "City is required"
  if (!form.postal_code.trim()) return "Postcode is required"
  return null
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, refresh, error, loading } = useCart()

  const [step, setStep] = useState<"address" | "shipping" | "payment">("address")
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDRESS)
  const [shippingOptions, setShippingOptions] = useState<ShippingOptionLite[]>([])
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const items = cart?.items ?? []
  const hasItems = items.length > 0

  const totals = useMemo(() => {
    const itemTotal = cart?.item_total ?? 0
    const shippingTotal = cart?.shipping_total ?? 0
    const taxTotal = cart?.tax_total ?? 0
    const total = cart?.total ?? 0
    return { itemTotal, shippingTotal, taxTotal, total }
  }, [cart])

  async function saveAddress() {
    setNotice(null)
    const problem = validateAddress(form)
    if (problem) {
      setNotice(problem)
      return
    }
    if (!cart?.id) return
    try {
      await sdk.store.cart.update(cart.id, {
        email: form.email,
        shipping_address: toAddressPayload(form),
        billing_address: toAddressPayload(form),
      })
      const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
        cart_id: cart.id,
      })
      setShippingOptions(shipping_options)
      if (shipping_options.length === 1) {
        setSelectedOptionId(shipping_options[0].id)
      }
      setStep("shipping")
      await refresh()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save your address")
    }
  }

  async function selectShipping(optionId: string) {
    setNotice(null)
    if (!cart?.id) return
    try {
      setSelectedOptionId(optionId)
      await sdk.store.cart.addShippingMethod(cart.id, { option_id: optionId })
      await refresh()
      setStep("payment")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not add shipping")
    }
  }

  async function placeOrder() {
    setNotice(null)
    if (!cart?.id) return
    setPlacing(true)
    try {
      // v2 initiates the payment collection + session from the cart object.
      await sdk.store.payment.initiatePaymentSession(cart, {
        provider_id: "pp_system_default",
      })
      const result = await sdk.store.cart.complete(cart.id)
      if (result.type === "cart") {
        setNotice(result.error?.message ?? "Payment was not completed")
        await refresh()
        return
      }
      if (result.order) {
        // clear the persisted cart id now that an order exists
        window.localStorage.removeItem("jpopt.cartId")
        router.push(`/order/${result.order.id}`)
        return
      }
      setNotice("Your order was placed but we could not load the confirmation.")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not place your order")
    } finally {
      setPlacing(false)
    }
  }

  if (!hasItems) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your cart is empty. Add a frame or lens configuration to continue.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Shop glasses
        </Link>
      </div>
    )
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>

      {(notice || error) && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {notice ?? error}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Step 1: Address */}
          <section className="rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                1
              </span>
              <h2 className="font-semibold">Contact and delivery</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                className={`${inputClass} sm:col-span-2`}
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Address line 1"
                value={form.address_1}
                onChange={(e) => setForm({ ...form, address_1: e.target.value })}
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Address line 2 (optional)"
                value={form.address_2}
                onChange={(e) => setForm({ ...form, address_2: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="County (optional)"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Postcode"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              />
              <select
                className={inputClass}
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              >
                <option value="gb">United Kingdom</option>
              </select>
            </div>
            <button
              onClick={saveAddress}
              disabled={loading}
              className="mt-5 inline-flex h-11 items-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              Continue to shipping
            </button>
          </section>

          {/* Step 2: Shipping */}
          {step !== "address" && (
            <section className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                  2
                </span>
                <h2 className="font-semibold">Delivery method</h2>
              </div>
              <div className="mt-5 space-y-3">
                {shippingOptions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No shipping options available.</p>
                ) : (
                  shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors ${
                        selectedOptionId === option.id
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedOptionId === option.id}
                          onChange={() => selectShipping(option.id)}
                          className="accent-emerald-700"
                        />
                        <span className="font-medium text-zinc-900">{option.name}</span>
                      </span>
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatMoney(option.amount ?? 0)}
                        {option.amount === 0 ? " (free)" : ""}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <section className="rounded-2xl border border-zinc-200 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                  3
                </span>
                <h2 className="font-semibold">Payment</h2>
              </div>
              <p className="mt-4 text-sm text-zinc-600">
                Pay securely with card at the Revolut checkout. For this
                development build the system payment provider is used, so orders
                complete instantly without leaving the site.
              </p>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {placing ? "Placing order…" : `Place order · ${formatMoney(totals.total)}`}
              </button>
            </section>
          )}
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-zinc-200 p-6">
          <h2 className="font-semibold text-zinc-900">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-zinc-700">
                  {item.title}
                  <span className="text-zinc-500"> × {item.quantity}</span>
                </span>
                <span className="shrink-0 font-medium text-zinc-900">
                  {formatMoney((item.unit_price ?? 0) * (item.quantity ?? 1))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">Subtotal</dt>
              <dd className="font-medium text-zinc-900">{formatMoney(totals.itemTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600">Shipping</dt>
              <dd className="font-medium text-zinc-900">{formatMoney(totals.shippingTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600">VAT included</dt>
              <dd className="font-medium text-zinc-900">{formatMoney(totals.taxTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
