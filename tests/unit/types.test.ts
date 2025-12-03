import { describe, it, expect } from 'vitest';
import type {
  ChutesProviderSettings,
  ChutesModelSettings,
  ChutesEmbeddingSettings,
  ChutesImageSettings,
  ModelCapabilities,
  ChutesModelId,
} from '../../src/types';

describe('Type Definitions', () => {
  it('should allow valid ChutesProviderSettings', () => {
    const settings: ChutesProviderSettings = {
      apiKey: 'test-key',
      baseURL: 'https://api.chutes.ai/v1',
      headers: { 'X-Custom': 'value' },
    };
    
    expect(settings.apiKey).toBe('test-key');
    expect(settings.baseURL).toBe('https://api.chutes.ai/v1');
    expect(settings.headers).toEqual({ 'X-Custom': 'value' });
  });

  it('should allow ChutesProviderSettings with retry config', () => {
    const settings: ChutesProviderSettings = {
      apiKey: 'test-key',
      retry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
      },
    };
    
    expect(settings.retry?.maxRetries).toBe(3);
  });

  it('should allow valid ChutesModelSettings', () => {
    const settings: ChutesModelSettings = {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      stopSequences: ['STOP'],
      seed: 42,
      userId: 'user123',
    };
    
    expect(settings.temperature).toBe(0.7);
    expect(settings.maxTokens).toBe(1000);
  });

  it('should allow valid ChutesEmbeddingSettings', () => {
    const settings: ChutesEmbeddingSettings = {
      dimensions: 1536,
      userId: 'user123',
    };
    
    expect(settings.dimensions).toBe(1536);
    expect(settings.userId).toBe('user123');
  });

  it('should allow valid ChutesImageSettings', () => {
    const settings: ChutesImageSettings = {
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
      n: 1,
      responseFormat: 'url',
    };
    
    expect(settings.size).toBe('1024x1024');
    expect(settings.quality).toBe('hd');
  });

  it('should allow valid ModelCapabilities', () => {
    const capabilities: ModelCapabilities = {
      chat: true,
      completion: false,
      tools: true,
      vision: true,
      functionCalling: true,
      streaming: true,
      reasoning: false,
      maxTokens: 4096,
      contextWindow: 128000,
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      pricing: {
        inputPer1M: 5,
        outputPer1M: 15,
      },
    };
    
    expect(capabilities.chat).toBe(true);
    expect(capabilities.maxTokens).toBe(4096);
    expect(capabilities.pricing?.inputPer1M).toBe(5);
  });

  it('should allow ChutesModelId as string', () => {
    const modelId: ChutesModelId = 'openai/gpt-4';
    expect(typeof modelId).toBe('string');
  });
});

