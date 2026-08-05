export type LensBuilderEvent =
  | 'lens_builder_opened'
  | 'lens_builder_step_viewed'
  | 'lens_builder_review_viewed'
  | 'lens_builder_submitted';

export type AnalyticsProperties = Record<string, string | number | boolean>;

export interface ZarazClient {
  track(eventName: string, properties?: AnalyticsProperties): Promise<void> | void;
}

declare global {
  interface Window {
    zaraz?: ZarazClient;
  }
}

export function createLensBuilderTracker(zaraz: ZarazClient | null | undefined) {
  return (event: LensBuilderEvent, properties: AnalyticsProperties = {}): void => {
    if (!zaraz) {
      return;
    }

    try {
      void Promise.resolve(zaraz.track(event, properties)).catch(() => {});
    } catch {
      // Analytics must never interrupt the customer journey.
    }
  };
}

export function trackLensBuilderEvent(event: LensBuilderEvent, properties: AnalyticsProperties = {}): void {
  const zaraz = typeof window === 'undefined' ? null : window.zaraz;
  createLensBuilderTracker(zaraz)(event, properties);
}
