import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Model Registry - Chutes Discovery', () => {
  it('should create a model registry instance', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    expect(registry).toBeDefined();
  });

  it('should infer capabilities from chute URL', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    
    // Chute URLs are in the format: https://{slug}.chutes.ai
    const capabilities = registry.getCapabilities('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');
    
    expect(capabilities).toBeDefined();
    expect(capabilities.chat).toBe(true);
    expect(capabilities.streaming).toBe(true);
  });

  it('should infer LLM capabilities from chute slug pattern', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    
    // Should recognize common open-source model names
    const deepseekCaps = registry.getCapabilities('https://chutes-deepseek-v3.chutes.ai');
    expect(deepseekCaps.chat).toBe(true);
    
    const llamaCaps = registry.getCapabilities('https://chutes-meta-llama-3-1.chutes.ai');
    expect(llamaCaps.chat).toBe(true);
    
    const qwenCaps = registry.getCapabilities('https://chutes-qwen-qwen2-5.chutes.ai');
    expect(qwenCaps.chat).toBe(true);
  });

  it('should NOT include closed-source models', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    
    // Should NOT have OpenAI GPT, Claude, or Gemini hardcoded
    const allModels = registry.getAllModels();
    
    const hasClosedSource = allModels.some(model => 
      model.includes('gpt-') || 
      model.includes('claude-') || 
      model.includes('gemini-')
    );
    
    expect(hasClosedSource).toBe(false);
  });

  it('should support fetching chutes from API dynamically', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    
    // Should have a method to fetch chutes from the API
    expect(registry.fetchAvailableChutes).toBeDefined();
    expect(typeof registry.fetchAvailableChutes).toBe('function');
  });

  it('should extract chute slug from URL', async () => {
    const { ChutesModelRegistry } = await import('../../src/registry/models');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const registry = new ChutesModelRegistry(config);
    
    // Should be able to extract slug from full chute URL
    const slug = registry.extractSlug('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');
    expect(slug).toBe('chutes-deepseek-ai-deepseek-v3');
    
    // Should handle URLs with paths
    const slug2 = registry.extractSlug('https://chutes-qwen-qwen2-5.chutes.ai/v1/chat/completions');
    expect(slug2).toBe('chutes-qwen-qwen2-5');
  });

  describe('Image Model Detection', () => {
    it('should detect z-image-turbo as image model', async () => {
      const { ChutesModelRegistry } = await import('../../src/registry/models');
      
      const config = {
        provider: 'chutes' as const,
        baseURL: 'https://api.chutes.ai',
        headers: () => ({ 'Authorization': 'Bearer test-key' }),
      };
      
      const registry = new ChutesModelRegistry(config);
      const capabilities = registry.getCapabilities('z-image-turbo');
      
      expect(capabilities.outputModalities).toContain('image');
      expect(capabilities.chat).toBe(false);
    });

    it('should detect generic image models by pattern', async () => {
      const { ChutesModelRegistry } = await import('../../src/registry/models');
      
      const config = {
        provider: 'chutes' as const,
        baseURL: 'https://api.chutes.ai',
        headers: () => ({ 'Authorization': 'Bearer test-key' }),
      };
      
      const registry = new ChutesModelRegistry(config);
      
      const testCases = [
        'my-image-generator',
        'cool-image-model', 
        'dall-e-clone',
        'stable-diffusion-xl',
        'flux-pro'
      ];
      
      testCases.forEach(slug => {
        const caps = registry.getCapabilities(slug);
        expect(caps.outputModalities).toContain('image');
        expect(caps.chat).toBe(false);
      });
    });

    it('should NOT detect vision LLMs as image models', async () => {
      const { ChutesModelRegistry } = await import('../../src/registry/models');
      
      const config = {
        provider: 'chutes' as const,
        baseURL: 'https://api.chutes.ai',
        headers: () => ({ 'Authorization': 'Bearer test-key' }),
      };
      
      const registry = new ChutesModelRegistry(config);
      
      // Vision LLMs should NOT be classified as image generation models
      const visionLLM = registry.getCapabilities('qwen-vl-image-llm');
      expect(visionLLM.chat).toBe(true);
      expect(visionLLM.outputModalities).not.toContain('image');
      expect(visionLLM.outputModalities).toContain('text');
    });
  });
});

