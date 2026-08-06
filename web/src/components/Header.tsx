"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { useCart } from "@/lib/cart"

const NAV = [
  { href: "/products", label: "Glasses" },
  { href: "/products?category=optical", label: "Optical" },
  { href: "/products?category=sunglasses", label: "Sunglasses" },
  { href: "/products?category=sports", label: "Sports" },
  { href: "/lens-studio", label: "Lens Studio" },
]

export function Header() {
  const { itemCount } = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState("")

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 text-xl font-semibold tracking-tight text-zinc-900">
          JPOpticians
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((item) => {
            const [path] = item.href.split("?")
            const active = pathname === path
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  active ? "text-emerald-700" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <form onSubmit={submitSearch} className="hidden sm:block">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search frames"
              aria-label="Search products"
              className="h-9 w-44 rounded-full border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </form>
          <Link
            href="/cart"
            aria-label={`Cart, ${itemCount} items`}
            className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-emerald-600 hover:text-emerald-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
