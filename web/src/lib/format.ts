/** Formatting helpers for GBP retail prices (stored as minor units, e.g. 17195 = £171.95). */

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
})

export function formatMoney(minor: number | null | undefined): string {
  if (minor === null || minor === undefined || Number.isNaN(minor)) {
    return "—"
  }
  return gbp.format(minor / 100)
}

/** Converts a major-unit number (e.g. 99 = £99) to minor units. */
export function majorToMinor(major: number): number {
  return Math.round(major * 100)
}

export function formatDate(iso: string | Date | undefined | null): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso))
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}
