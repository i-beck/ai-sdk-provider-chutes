import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the chute-discovery module before any imports
vi.mock('../../src/utils/chute-discovery', async () => {
  const actual = await vi.importActual('../../src/utils/chute-discovery');
  return {
    ...actual,
    discoverChutes: vi.fn(),
    filterChutesByType: vi.fn(),
    getChuteUrl: vi.fn((slug: string) => `https://${slug}.chutes.ai`),
  };
});

import * as chuteDiscovery from '../../src/utils/chute-discovery';

describe('Provider Default Model Discovery', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Reset environment variables
    delete process.env.CHUTES_API_KEY;
    delete process.env.CHUTES_DEFAULT_MODEL;
    
    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear module cache to get fresh imports
    vi.resetModules();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Lazy Default Discovery', () => {
    it('should warn and discover default when no model specified and no env var set', async () => {
      // Mock discoverChutes to return test data
      (chuteDiscovery.discoverChutes as any).mockResolvedValue([
        {
          chute_id: 'test-llm-1',
          slug: 'chutes-test-llm',
          name: 'Test LLM',
          standard_template: 'llm',
        },
      ]);
      
      (chuteDiscovery.filterChutesByType as any).mockReturnValue([
        {
          chute_id: 'test-llm-1',
          slug: 'chutes-test-llm',
          name: 'Test LLM',
          standard_template: 'llm',
        },
      ]);

      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
      });
      
      // Call without model ID
      const model = await provider();
      
      // Should have warned
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CHUTES_DEFAULT_MODEL not set')
      );
      
      // Should have discovered and returned a model
      expect(model).toBeDefined();
      expect(model.modelId).toBe('https://chutes-test-llm.chutes.ai');
      
      // Should have set env var
      expect(process.env.CHUTES_DEFAULT_MODEL).toBe('https://chutes-test-llm.chutes.ai');
    });

    it('should use CHUTES_DEFAULT_MODEL if set without warning', async () => {
      process.env.CHUTES_DEFAULT_MODEL = 'https://chutes-my-model.chutes.ai';

      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
      });
      
      const model = await provider();
      
      // Should NOT have warned
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      // Should use the env var model
      expect(model).toBeDefined();
      expect(model.modelId).toBe('https://chutes-my-model.chutes.ai');
    });

    it('should use defaultModel option if provided', async () => {
      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
        defaultModel: 'https://chutes-configured-model.chutes.ai',
      });
      
      const model = await provider();
      
      // Should NOT warn
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      // Should use the configured default
      expect(model).toBeDefined();
      expect(model.modelId).toBe('https://chutes-configured-model.chutes.ai');
    });

    it('should not cache in memory - each provider instance uses env var', async () => {
      // Mock discovery
      (chuteDiscovery.discoverChutes as any).mockResolvedValue([
        {
          chute_id: 'test-llm-1',
          slug: 'chutes-discovered',
          name: 'Discovered LLM',
          standard_template: 'llm',
        },
      ]);
      
      (chuteDiscovery.filterChutesByType as any).mockReturnValue([
        {
          chute_id: 'test-llm-1',
          slug: 'chutes-discovered',
          name: 'Discovered LLM',
          standard_template: 'llm',
        },
      ]);

      const { createChutes } = await import('../../src/chutes-provider');
      
      // First provider instance
      const provider1 = createChutes({ apiKey: 'test-key-1' });
      await provider1();
      
      const discoveredDefault = process.env.CHUTES_DEFAULT_MODEL;
      expect(discoveredDefault).toBe('https://chutes-discovered.chutes.ai');
      
      // Change env var
      process.env.CHUTES_DEFAULT_MODEL = 'https://chutes-manual-override.chutes.ai';
      
      // Second provider instance should use new env var
      const provider2 = createChutes({ apiKey: 'test-key-2' });
      const model2 = await provider2();
      
      expect(model2.modelId).toBe('https://chutes-manual-override.chutes.ai');
    });

    it('should just use default model without validation (skip test for now)', async () => {
      // Note: Validating if a default model is available would require making
      // a test API call on every provider creation, which is too expensive.
      // Instead, we trust the user to set a valid default or let errors happen naturally.
      
      process.env.CHUTES_DEFAULT_MODEL = 'https://chutes-any-model.chutes.ai';

      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
      });
      
      const model = await provider();
      
      // Should use the env var without validation
      expect(model).toBeDefined();
      expect(model.modelId).toBe('https://chutes-any-model.chutes.ai');
      
      // Should NOT warn (we trust the user's setting)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should throw error if no models available to discover', async () => {
      // Mock empty discovery
      (chuteDiscovery.discoverChutes as any).mockResolvedValue([]);
      (chuteDiscovery.filterChutesByType as any).mockReturnValue([]);

      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
      });
      
      // Should throw when no models available
      await expect(provider()).rejects.toThrow('No LLM chutes available');
    });
  });

  describe('Explicit Model ID Always Works', () => {
    it('should use explicit model ID even if default is set', async () => {
      process.env.CHUTES_DEFAULT_MODEL = 'https://chutes-default.chutes.ai';

      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({
        apiKey: 'test-api-key',
      });
      
      // Explicit model ID should take precedence
      const model = provider('https://chutes-explicit.chutes.ai');
      
      expect(model.modelId).toBe('https://chutes-explicit.chutes.ai');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});

