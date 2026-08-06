import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/products" className="hover:text-zinc-900">All glasses</Link></li>
            <li><Link href="/products?category=optical" className="hover:text-zinc-900">Optical</Link></li>
            <li><Link href="/products?category=sunglasses" className="hover:text-zinc-900">Sunglasses</Link></li>
            <li><Link href="/products?category=sports" className="hover:text-zinc-900">Sports</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Lenses</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/lens-studio" className="hover:text-zinc-900">Lens Studio</Link></li>
            <li><Link href="/lens-studio?mode=reglaze" className="hover:text-zinc-900">Reglaze my glasses</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Help</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li><Link href="/cart" className="hover:text-zinc-900">Cart</Link></li>
            <li><Link href="/checkout" className="hover:text-zinc-900">Checkout</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">JPOpticians</p>
          <p className="mt-3 text-sm text-zinc-600">
            Prescription glasses, crafted in the UK. Prices include VAT.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-200">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">
          © {new Date().getFullYear()} JPOpticians. All prices in GBP including UK VAT.
        </p>
      </div>
    </footer>
  )
}
