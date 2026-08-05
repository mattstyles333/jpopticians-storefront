# JPOpticians.com Storefront

The JPOpticians.com frontend: a Next.js (App Router) storefront that embeds the
`@jpop/lens-set-core` lens configurator engine, connected to the
`jpopticians-backend` Medusa v2 store on Medusa Cloud.

## Repositories

| Repo | Purpose |
|---|---|
| `mattstyles333/jpopticians-storefront` | This repo: Next.js storefront + lens-set-core package |
| `mattstyles333/jpopticians-backend` | Medusa v2 backend (catalogue, orders, payments, search, IMS) |

## Structure

- `packages/lens-set-core` — framework-independent lens configuration engine,
  forked from the Spex4Less `lens-set` Svelte project (see its README).
- `web` — the Next.js App Router storefront.

## Development

```bash
npm install
npm run dev          # starts the Next.js storefront
```

The storefront talks to the backend via `NEXT_PUBLIC_MEDUSA_BACKEND_URL`.
