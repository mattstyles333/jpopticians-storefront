import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLensBuilderTracker } from '../src/analytics';

describe('lens builder analytics', () => {
  it('forwards events and flat properties to Zaraz', () => {
    let captured: { event: string; properties: Record<string, string | number | boolean> } | null = null;
    const track = createLensBuilderTracker({
      track(event, properties = {}) {
        captured = { event, properties };
      },
    });

    track('lens_builder_step_viewed', {
      step_id: 'use-case',
      step_index: 1,
      journey_source: 'frame',
    });

    assert.deepEqual(captured, {
      event: 'lens_builder_step_viewed',
      properties: {
        step_id: 'use-case',
        step_index: 1,
        journey_source: 'frame',
      },
    });
  });

  it('does nothing when Zaraz is unavailable or throws', () => {
    assert.doesNotThrow(() => createLensBuilderTracker(null)('lens_builder_opened'));
    assert.doesNotThrow(() => createLensBuilderTracker({
      track() {
        throw new Error('Zaraz failed');
      },
    })('lens_builder_opened'));
  });
});
