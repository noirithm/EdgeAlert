import { describe, expect, it } from 'vitest';
import { STATEWEAVE_CORE_VERSION } from './index.js';

describe('workspace scaffold', () => {
  it('exposes a version string from @stateweave/core', () => {
    expect(STATEWEAVE_CORE_VERSION).toBe('0.0.1');
  });
});
