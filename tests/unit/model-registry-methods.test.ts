import { describe, it, expect } from 'vitest';
import { ChutesModelRegistry } from '../../src/registry/models';
import type { ChuteInfo } from '../../src/registry/models';

describe('Model Registry Methods', () => {
  let registry: ChutesModelRegistry;

  beforeEach(() => {
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    registry = new ChutesModelRegistry(config);
  });

  describe('getLLMChutes', () => {
    it('should filter LLM chutes by vllm template', () => {
      // Populate registry with mock data
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'llm-1',
          name: 'DeepSeek V3',
          standard_template: 'vllm',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'image-1',
          name: 'FLUX',
          standard_template: 'diffusion',
          public: true,
        },
        {
          chute_id: '3',
          slug: 'llm-2',
          name: 'Llama 3.1',
          standard_template: 'vllm',
          public: true,
        },
      ];

      // Manually populate cache for testing
      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const llmChutes = registry.getLLMChutes();
      
      expect(llmChutes.length).toBe(2);
      expect(llmChutes[0].slug).toBe('llm-1');
      expect(llmChutes[1].slug).toBe('llm-2');
    });

    it('should filter LLM chutes by name keywords', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'deepseek-v3',
          name: 'DeepSeek Chat',
          standard_template: 'custom',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'mistral-7b',
          name: 'Mistral 7B',
          standard_template: 'custom',
          public: true,
        },
        {
          chute_id: '3',
          slug: 'flux-model',
          name: 'FLUX Image',
          standard_template: 'custom',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const llmChutes = registry.getLLMChutes();
      
      // Should find DeepSeek and Mistral
      expect(llmChutes.length).toBeGreaterThanOrEqual(2);
      const slugs = llmChutes.map(c => c.slug);
      expect(slugs).toContain('deepseek-v3');
      expect(slugs).toContain('mistral-7b');
    });

    it('should return empty array when no LLM chutes exist', () => {
      (registry as any).cachedChutes.clear();
      const llmChutes = registry.getLLMChutes();
      expect(llmChutes).toEqual([]);
    });
  });

  describe('getImageChutes', () => {
    it('should filter image chutes by diffusion template', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'flux-1',
          name: 'FLUX.1-dev',
          standard_template: 'diffusion',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'llm-1',
          name: 'GPT',
          standard_template: 'vllm',
          public: true,
        },
        {
          chute_id: '3',
          slug: 'sdxl-1',
          name: 'Stable Diffusion XL',
          standard_template: 'diffusion',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const imageChutes = registry.getImageChutes();
      
      expect(imageChutes.length).toBe(2);
      expect(imageChutes[0].slug).toBe('flux-1');
      expect(imageChutes[1].slug).toBe('sdxl-1');
    });

    it('should filter image chutes by name keywords', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'custom-flux',
          name: 'My FLUX Model',
          standard_template: 'custom',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'stable-diff',
          name: 'Stable Diffusion',
          standard_template: 'custom',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const imageChutes = registry.getImageChutes();
      
      expect(imageChutes.length).toBe(2);
    });

    it('should return empty array when no image chutes exist', () => {
      (registry as any).cachedChutes.clear();
      const imageChutes = registry.getImageChutes();
      expect(imageChutes).toEqual([]);
    });
  });

  describe('getEmbeddingChutes', () => {
    it('should filter embedding chutes by TEI template', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'embed-1',
          name: 'BGE Embeddings',
          standard_template: 'tei',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'llm-1',
          name: 'GPT',
          standard_template: 'vllm',
          public: true,
        },
        {
          chute_id: '3',
          slug: 'embed-2',
          name: 'E5 Embeddings',
          standard_template: 'tei',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const embeddingChutes = registry.getEmbeddingChutes();
      
      expect(embeddingChutes.length).toBe(2);
      expect(embeddingChutes[0].slug).toBe('embed-1');
      expect(embeddingChutes[1].slug).toBe('embed-2');
    });

    it('should filter embedding chutes by name keywords', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'text-embed-3',
          name: 'Text Embeddings 3',
          standard_template: 'custom',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const embeddingChutes = registry.getEmbeddingChutes();
      
      expect(embeddingChutes.length).toBe(1);
      expect(embeddingChutes[0].slug).toBe('text-embed-3');
    });

    it('should return empty array when no embedding chutes exist', () => {
      (registry as any).cachedChutes.clear();
      const embeddingChutes = registry.getEmbeddingChutes();
      expect(embeddingChutes).toEqual([]);
    });
  });

  describe('getChutesByTemplate', () => {
    it('should filter by specific template type', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'vllm-1',
          name: 'Model 1',
          standard_template: 'vllm',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'diffusion-1',
          name: 'Model 2',
          standard_template: 'diffusion',
          public: true,
        },
        {
          chute_id: '3',
          slug: 'vllm-2',
          name: 'Model 3',
          standard_template: 'vllm',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const vllmChutes = registry.getChutesByTemplate('vllm');
      
      expect(vllmChutes.length).toBe(2);
      expect(vllmChutes[0].slug).toBe('vllm-1');
      expect(vllmChutes[1].slug).toBe('vllm-2');
    });

    it('should be case-insensitive', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'test-1',
          name: 'Model 1',
          standard_template: 'vllm',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const uppercase = registry.getChutesByTemplate('VLLM');
      const lowercase = registry.getChutesByTemplate('vllm');
      
      expect(uppercase.length).toBe(lowercase.length);
    });

    it('should return empty array for non-existent template', () => {
      (registry as any).cachedChutes.clear();
      const result = registry.getChutesByTemplate('non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for cached model', () => {
      const mockChute: ChuteInfo = {
        chute_id: '1',
        slug: 'test-model',
        name: 'Test Model',
        standard_template: 'vllm',
        public: true,
      };

      (registry as any).cachedChutes.set('test-model', mockChute);

      expect(registry.isModelAvailable('test-model')).toBe(true);
    });

    it('should return true for cached model by URL', () => {
      const mockChute: ChuteInfo = {
        chute_id: '1',
        slug: 'test-model',
        name: 'Test Model',
        standard_template: 'vllm',
        public: true,
      };

      (registry as any).cachedChutes.set('test-model', mockChute);

      expect(registry.isModelAvailable('https://test-model.chutes.ai')).toBe(true);
    });

    it('should return false for non-existent model', () => {
      (registry as any).cachedChutes.clear();
      expect(registry.isModelAvailable('non-existent')).toBe(false);
    });
  });

  describe('getModelsByCapability', () => {
    it('should filter models by capability', () => {
      const mockChutes: ChuteInfo[] = [
        {
          chute_id: '1',
          slug: 'llama-3',
          name: 'Llama 3',
          standard_template: 'vllm',
          public: true,
        },
        {
          chute_id: '2',
          slug: 'flux-1',
          name: 'FLUX',
          standard_template: 'diffusion',
          public: true,
        },
      ];

      (registry as any).cachedChutes.clear();
      mockChutes.forEach(chute => {
        (registry as any).cachedChutes.set(chute.slug, chute);
      });

      const chatModels = registry.getModelsByCapability('chat');
      const streamingModels = registry.getModelsByCapability('streaming');
      
      expect(chatModels.length).toBeGreaterThan(0);
      expect(streamingModels.length).toBeGreaterThan(0);
    });

    it('should return empty array when no models match capability', () => {
      (registry as any).cachedChutes.clear();
      const result = registry.getModelsByCapability('chat');
      expect(result).toEqual([]);
    });
  });
});

