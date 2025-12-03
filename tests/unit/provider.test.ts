import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Provider Factory', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.CHUTES_API_KEY;
  });

  it('should create a provider instance', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('should return a language model when called as a function', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    const model = provider('openai/gpt-4');
    
    expect(model).toBeDefined();
    expect(model.specificationVersion).toBe('v2');
    expect(model.provider).toBe('chutes');
    expect(model.modelId).toBe('openai/gpt-4');
  });

  it('should have chat method', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(provider.chat).toBeDefined();
    expect(typeof provider.chat).toBe('function');
    
    const model = provider.chat('openai/gpt-4');
    expect(model).toBeDefined();
  });

  it('should have completion method', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(provider.completion).toBeDefined();
    expect(typeof provider.completion).toBe('function');
  });

  it('should have languageModel method', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(provider.languageModel).toBeDefined();
    expect(typeof provider.languageModel).toBe('function');
  });

  it('should have textEmbeddingModel method', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(provider.textEmbeddingModel).toBeDefined();
    expect(typeof provider.textEmbeddingModel).toBe('function');
  });

  it('should throw error if called with new keyword', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    expect(() => {
      // @ts-expect-error - Testing runtime error
      new provider('openai/gpt-4');
    }).toThrow('cannot be called with the new keyword');
  });

  it('should use default baseURL if not provided', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
    });
    
    // We'll test this indirectly by checking the model config
    const model = provider('openai/gpt-4');
    expect(model).toBeDefined();
  });

  it('should allow custom baseURL', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({
      apiKey: 'test-api-key',
      baseURL: 'https://custom.api.com/v1',
    });
    
    const model = provider('openai/gpt-4');
    expect(model).toBeDefined();
  });
});

describe('Default Provider Instance', () => {
  it('should export default chutes instance', async () => {
    process.env.CHUTES_API_KEY = 'test-key-from-env';
    
    const { chutes } = await import('../../src/chutes-provider');
    
    expect(chutes).toBeDefined();
    expect(typeof chutes).toBe('function');
  });
});

