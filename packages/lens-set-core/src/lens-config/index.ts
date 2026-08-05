import type { LensConfig } from '../types';
import { lensConfigMeta } from './meta';
import { steps } from './steps';
import { glazingRouteGroup } from './groups/glazing-route';
import { frameTypeGroup } from './groups/frame-type';
import { lensFamilyGroup } from './groups/lens-family';
import { lensDesignGroup } from './groups/lens-design';
import { luxotticaAuthenticsGroups } from './groups/luxottica-authentics';
import { mauiJimSunGroups } from './groups/maui-jim-sun';
import { packageGroups } from './groups/package';
import { prismGroup } from './groups/prism';
import { prescriptionGroup } from './groups/prescription';
import { tintGroups } from './groups/tint';
import { useCaseGroup } from './groups/use-case';
import type { BackendDataStore } from '../backend-data';


// Merge backend lenses data with app config
// todo: WARNING, may throw an error, current file (as many other files which can possibly fail)
// todo: is statically imported in many different places very early on in app's life
// todo: there is no way to reasonably handle such errors
// todo: we probably need to rethink and rewrite app startup logic (e.g. dynamic imports or exports in a form of lazy evaluated
// todo: functions etc., and some way to handle and display such errors if they happen early on;
// todo: ideally we should have some app core, responsible for app startup, loading of dependencies, merging data from backend, handling critical errors
// todo: and serving as module registry for the rest of the application
console.log('[lib/lens-config/index.ts]: trying to merge lens config with backend lens config, can throw an error, see comments in the original file (comments are removed by vite build process)');

function createBaseLensConfig(): LensConfig {
  return structuredClone({
    ...lensConfigMeta,
    steps,
    options: {
      'glazing-route': glazingRouteGroup,
      'frame-type': frameTypeGroup,
      // Retained off-path so Magento can continue supplying and receiving lens_family values.
      'lens-family': lensFamilyGroup,
      'use-case': useCaseGroup,
      'lens-design': lensDesignGroup,
      ...luxotticaAuthenticsGroups,
      ...mauiJimSunGroups,
      prism: prismGroup,
      prescription: prescriptionGroup,
      ...tintGroups,
      ...packageGroups,
    },
  }) as LensConfig;
}

export function createLensConfig(backend?: BackendDataStore): LensConfig {
  const config = createBaseLensConfig();
  return backend ? backend.mergeBackendLensConfig(config) : config;
}

// Pristine default configuration for domain helpers and tests.
export const lensConfig = createLensConfig();
