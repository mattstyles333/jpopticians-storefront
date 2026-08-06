"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"

import { useCart } from "@/lib/cart"
import { formatMoney } from "@/lib/format"
import {
  buildPrescriptionState,
  buildStudioDraft,
  toFrameContext,
  type LensStudioFrame,
} from "@/lib/lens"

interface LensStudioClientProps {
  frame: LensStudioFrame
  frameVariantId: string | null
  lensVariantId: string | null
  lensBasePriceMinor: number | null
  lensTitle: string
}

interface PrescriptionForm {
  rightSphere: string
  rightCylinder: string
  rightAxis: string
  leftSphere: string
  leftCylinder: string
  leftAxis: string
  pd: string
}

const EMPTY_PRESCRIPTION: PrescriptionForm = {
  rightSphere: "",
  rightCylinder: "",
  rightAxis: "180",
  leftSphere: "",
  leftCylinder: "",
  leftAxis: "180",
  pd: "64.0",
}

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"

export function LensStudioClient({
  frame,
  frameVariantId,
  lensVariantId,
  lensBasePriceMinor,
  lensTitle,
}: LensStudioClientProps) {
  const { addLensSetToCart, loading, error } = useCart()
  const [step, setStep] = useState<"lens" | "prescription" | "review">("lens")
  const [prescription, setPrescription] = useState<PrescriptionForm>(EMPTY_PRESCRIPTION)
  const [terms, setTerms] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  const lensPriceMajor = lensBasePriceMinor !== null ? lensBasePriceMinor / 100 : null
  const configured = useMemo(() => {
    if (lensPriceMajor === null) return null
    return buildStudioDraft({
      frame: toFrameContext(frame),
      selections: { "lens-type": "single-vision" },
      prescription: buildPrescriptionState(prescription),
      lensBasePriceMajor: lensPriceMajor,
      termsAccepted: terms,
    })
  }, [frame, lensPriceMajor, prescription, terms])

  const prescriptionValid =
    prescription.rightSphere.trim() !== "" &&
    prescription.leftSphere.trim() !== "" &&
    prescription.pd.trim() !== ""

  function updateField(field: keyof PrescriptionForm, value: string) {
    setPrescription((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddToCart() {
    setNotice(null)
    if (!configured) {
      setNotice("Lens pricing is not available yet.")
      return
    }
    if (!frameVariantId || !lensVariantId) {
      setNotice("This frame or the lens product is not available for purchase yet.")
      return
    }
    if (!terms) {
      setNotice("Please confirm your prescription is accurate before continuing.")
      return
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
      const publishableKey = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ?? ""
      const res = await fetch(`${baseUrl}/store/lens-configs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableKey,
        },
        body: JSON.stringify(configured),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.id) {
        throw new Error(body?.message ?? "Could not save the lens configuration")
      }
      await addLensSetToCart(frameVariantId, lensVariantId, body.id)
      setAdded(true)
      setStep("review")
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not add lenses to cart")
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Step 1: Lens type */}
        <section className="rounded-2xl border border-zinc-200 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
              1
            </span>
            <h2 className="font-semibold">Choose your lenses</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep("prescription")}
              className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 text-left"
            >
              <p className="font-semibold text-zinc-900">Single vision</p>
              <p className="mt-1 text-sm text-zinc-600">
                One prescription across the whole lens. Ideal for distance or
                reading.
              </p>
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                {lensPriceMajor !== null ? formatMoney(lensPriceMajor * 100) : "—"}
              </p>
            </button>
            <div className="rounded-2xl border border-dashed border-zinc-300 p-5">
              <p className="font-semibold text-zinc-900">Varifocal &amp; premium</p>
              <p className="mt-1 text-sm text-zinc-600">
                Progressive, tinted and supplier-glazed lenses are enabled by the
                pricing engine once its data bridge is configured.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Coming soon
              </p>
            </div>
          </div>
        </section>

        {/* Step 2: Prescription */}
        {step !== "lens" && (
          <section className="rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                2
              </span>
              <h2 className="font-semibold">Your prescription</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2">
                Right eye (OD)
              </p>
              <label className="block">
                <span className="text-xs text-zinc-600">Sphere (SPH)</span>
                <input
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. -2.00"
                  value={prescription.rightSphere}
                  onChange={(e) => updateField("rightSphere", e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-zinc-600">Cylinder (CYL)</span>
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="0.00"
                    value={prescription.rightCylinder}
                    onChange={(e) => updateField("rightCylinder", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-600">Axis</span>
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="180"
                    value={prescription.rightAxis}
                    onChange={(e) => updateField("rightAxis", e.target.value)}
                  />
                </label>
              </div>

              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-2">
                Left eye (OS)
              </p>
              <label className="block">
                <span className="text-xs text-zinc-600">Sphere (SPH)</span>
                <input
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. -1.50"
                  value={prescription.leftSphere}
                  onChange={(e) => updateField("leftSphere", e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-zinc-600">Cylinder (CYL)</span>
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="0.00"
                    value={prescription.leftCylinder}
                    onChange={(e) => updateField("leftCylinder", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-600">Axis</span>
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="180"
                    value={prescription.leftAxis}
                    onChange={(e) => updateField("leftAxis", e.target.value)}
                  />
                </label>
              </div>

              <label className="block sm:col-span-2">
                <span className="text-xs text-zinc-600">
                  Pupillary distance (PD, mm)
                </span>
                <input
                  className={`${inputClass} mt-1`}
                  placeholder="64.0"
                  value={prescription.pd}
                  onChange={(e) => updateField("pd", e.target.value)}
                />
              </label>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-emerald-700"
              />
              <span>
                I confirm my prescription is accurate and I have a valid
                prescription from an optician. It will be stored encrypted for
                order fulfilment.
              </span>
            </label>

            <button
              type="button"
              onClick={() => setStep("review")}
              disabled={!prescriptionValid}
              className="mt-5 inline-flex h-11 items-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Review order
            </button>
            {!prescriptionValid && (
              <p className="mt-2 text-xs text-zinc-500">
                Enter both spheres and a PD to continue.
              </p>
            )}
          </section>
        )}

        {/* Step 3: Review */}
        {step === "review" && configured && (
          <section className="rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                3
              </span>
              <h2 className="font-semibold">Review</h2>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Frame</dt>
                <dd className="font-medium text-zinc-900">{frame.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Lenses</dt>
                <dd className="font-medium text-zinc-900">
                  {lensTitle} · Single vision
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Right eye</dt>
                <dd className="text-zinc-900">
                  {prescription.rightSphere || "0.00"}
                  {prescription.rightCylinder ? ` / ${prescription.rightCylinder}` : ""}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Left eye</dt>
                <dd className="text-zinc-900">
                  {prescription.leftSphere || "0.00"}
                  {prescription.leftCylinder ? ` / ${prescription.leftCylinder}` : ""}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">PD</dt>
                <dd className="text-zinc-900">{prescription.pd} mm</dd>
              </div>
            </dl>

            {notice && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {notice}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={loading}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
            >
              {added ? "Added to cart ✓" : loading ? "Adding…" : "Add frame + lenses to cart"}
            </button>
            {added && (
              <Link
                href="/cart"
                className="ml-3 inline-flex h-12 items-center rounded-full border border-zinc-300 px-7 text-sm font-semibold text-zinc-900 hover:border-emerald-600"
              >
                View cart
              </Link>
            )}
          </section>
        )}
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-zinc-200 p-6">
        {frame.imageUrl && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={frame.imageUrl}
              alt={frame.name}
              fill
              sizes="340px"
              className="object-cover"
            />
          </div>
        )}
        <h2 className="mt-4 font-semibold text-zinc-900">{frame.name}</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Frame</dt>
            <dd className="font-medium text-zinc-900">
              {frame.framePrice !== null ? formatMoney(frame.framePrice * 100) : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">Lenses</dt>
            <dd className="font-medium text-zinc-900">
              {lensPriceMajor !== null ? formatMoney(lensPriceMajor * 100) : "—"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>
              {lensPriceMajor !== null && frame.framePrice !== null
                ? formatMoney((lensPriceMajor + frame.framePrice) * 100)
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          Prices include UK VAT. Your prescription is stored encrypted and only
          visible to our opticians for fulfilment.
        </p>
      </aside>
    </div>
  )
}
