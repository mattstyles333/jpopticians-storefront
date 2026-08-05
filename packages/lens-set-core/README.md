# @jpop/lens-set-core

Framework-independent lens configuration engine for JPOpticians.com, forked from the
Spex4Less `lens-set` project (Svelte 5 + Vite, v5.1.0).

## Why this package exists

The original `lens-set` app embedded a rich lens configurator inside a Magento
storefront. The domain logic (lens option rules, pricing, prescription
validation, journey state, persistence payloads) lived in `app/lib`. This
package extracts that logic into pure TypeScript with **zero framework
imports**, so it can be reused by:

- the Next.js storefront (lens studio, product-page lens configuration),
- the Medusa backend (order processing, staff review),
- future hosts (Svelte, Vue, plain DOM, CLI tools).

## Porting notes

| Original file | This package | Change |
|---|---|---|
| `app/lib/journey.svelte.ts` | `src/journey.ts` | Svelte runes (`$state`/`$derived`/`$effect`) rewritten as an observable `JourneyController` (`getState()` + `subscribe()`) with identical semantics |
| `app/lib/backend-data.svelte.ts` | `src/backend-data.ts` | Same class, Svelte removed |
| `app/lib/app-version.ts` | `src/app-version.ts` | No `package.json` import; load-time constant |
| `app/lib/ui-config.ts` | `src/ui-config.ts` | `import.meta.env.DEV` replaced with environment check |
| everything else | unchanged | copied and re-exported |

## Usage

```ts
import { createJourneyController, lensConfig, getDefaultFrameContext } from '@jpop/lens-set-core';

const frame = getDefaultFrameContext();
const journey = createJourneyController(lensConfig, frame);

const unsubscribe = journey.subscribe((state) => {
  console.log(state.totalPrice, state.journeyComplete);
});

journey.selectBuilderOption('use-case', 'varifocal');
unsubscribe();
```

## Development

```bash
bun test        # run the full ported test suite
bun run verify  # typecheck + test
```
