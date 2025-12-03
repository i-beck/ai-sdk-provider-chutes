import { describe, it, expect } from 'vitest';
import { VERSION } from '../../src/version';
import * as packageJson from '../../package.json';

describe('VERSION Export', () => {
  it('should export VERSION constant', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
  });

  it('should match package.json version', () => {
    expect(VERSION).toBe(packageJson.version);
  });

  it('should be a valid semver string', () => {
    // Basic semver format check: X.Y.Z or X.Y.Z-suffix
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
    expect(VERSION).toMatch(semverPattern);
  });

  it('should not be empty', () => {
    expect(VERSION.length).toBeGreaterThan(0);
  });

  it('should be accessible from main index export', async () => {
    const { VERSION: exportedVersion } = await import('../../src/index');
    expect(exportedVersion).toBe(VERSION);
  });
});

