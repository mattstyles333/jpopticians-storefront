/**
 * @jpop/lens-set-core
 *
 * Framework-independent lens configuration engine for JPOpticians.com.
 *
 * Forked from the Spex4Less `lens-set` project (gitlab.s4l.link/matt/lens-set,
 * v5.1.0). The original was a Svelte 5 + Vite app; the domain logic lived in
 * `app/lib`. This package extracts that logic into a zero-framework
 * TypeScript library so it can be embedded in a Next.js storefront, a Medusa
 * backend, or any other host.
 *
 * Changes vs the original:
 * - `journey.svelte.ts` (Svelte runes) -> `journey.ts` (observable
 *   `JourneyController` with `getState()` / `subscribe()`).
 * - `backend-data.svelte.ts` -> `backend-data.ts` (same class, no Svelte).
 * - `app-version.ts` no longer imports `package.json`.
 * - `ui-config.ts` no longer uses `import.meta.env`.
 */
export * from './types';
export * from './builder';
export * from './prescription';
export * from './currency';
export * from './review';
export * from './storage';
export * from './frame-context';
export * from './backend-data';
export * from './journey';
export * from './persistence';
export * from './analytics';
export * from './ui-config';
export * from './app-version';
export * from './lens-config';
export * from './lens-config/conditions';
export * from './lens-config/helpers';
export * from './lens-config/supplier-glazing';
export * from './lens-config/steps';
export * from './adapters/magento';
