# JPOpticians Storefront

Next.js 16 storefront for the Medusa v2 backend. Uses `@medusajs/js-sdk` for
the store API and `@jpop/lens-set-core` for the lens configurator.

## Setup

```bash
npm install
cp web/.env.example web/.env.local
# Edit web/.env.local with your backend's publishable key and region ID
```

## Development

```bash
npm run dev          # starts the web app on port 3000
```

## Verification

### TypeScript + lint

```bash
npm run verify       # runs tsc --noEmit + eslint across all workspaces
```

### Full UI journey

Requires the Medusa backend on `:9000` and Playwright globally installed.

```bash
node scripts/e2e-storefront-ui.mjs
```

Override the storefront URL:
```bash
STOREFRONT_URL=http://localhost:3000 node scripts/e2e-storefront-ui.mjs
```

To watch the browser (non-headless):
```bash
SHOW_BROWSER=1 node scripts/e2e-storefront-ui.mjs
```

## Architecture

- **Server components** render PLP, PDP, home, order confirmation, and the
  lens-studio shell. Cart and checkout are **client components**.
- **Cart state** is managed by a `CartProvider` context that persists the cart
  ID in `localStorage`.
- **Lens Studio** uses `@jpop/lens-set-core`'s `JourneyController` and
  `buildLensCustomizationDraft` to produce a lens configuration payload that
  is POSTed to `/store/lens-configs` (encrypted at rest) and then added to the
  cart via `/store/carts/:id/lens-items`.
- **Prices** are in minor units (GBP pence) throughout. The standard single-vision
  lens price is configured via `NEXT_PUBLIC_STANDARD_LENS_PRICE` (default 99).