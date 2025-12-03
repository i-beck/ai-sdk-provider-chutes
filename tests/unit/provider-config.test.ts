import { describe, it, expect, vi } from 'vitest';
import { createChutes } from '../../src/chutes-provider';

describe('Provider Configuration', () => {
  describe('Custom Headers', () => {
    it('should accept custom headers in configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Request-ID': 'test-123',
        },
      });

      expect(provider).toBeDefined();
      expect(typeof provider).toBe('function');
    });

    it('should create models with custom headers configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      const model = provider('test-model');
      expect(model).toBeDefined();
      expect(model.provider).toBe('chutes');
    });
  });

  describe('Custom Fetch Implementation', () => {
    it('should accept custom fetch in configuration', () => {
      const customFetch = vi.fn();
      
      const provider = createChutes({
        apiKey: 'test-key',
        fetch: customFetch as any,
      });

      expect(provider).toBeDefined();
    });

    it('should create models with custom fetch', () => {
      const customFetch = vi.fn();
      
      const provider = createChutes({
        apiKey: 'test-key',
        fetch: customFetch as any,
      });

      const model = provider('test-model');
      expect(model).toBeDefined();
    });
  });

  describe('Custom generateId', () => {
    it('should accept custom generateId in configuration', () => {
      const customGenerateId = vi.fn(() => 'custom-id-123');
      
      const provider = createChutes({
        apiKey: 'test-key',
        generateId: customGenerateId,
      });

      expect(provider).toBeDefined();
    });
  });

  describe('Retry Configuration', () => {
    it('should accept retry configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        retry: {
          maxRetries: 5,
          initialDelayMs: 2000,
          maxDelayMs: 30000,
        },
      });

      expect(provider).toBeDefined();
    });

    it('should work with default retry configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
    });
  });

  describe('Combined Configuration', () => {
    it('should accept all configuration options together', () => {
      const customFetch = vi.fn();
      const customGenerateId = vi.fn(() => 'id-123');

      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
        headers: {
          'X-Custom': 'value',
        },
        fetch: customFetch as any,
        generateId: customGenerateId,
        retry: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        },
      });

      expect(provider).toBeDefined();
      expect(typeof provider).toBe('function');
    });

    it('should create embedding models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
        headers: {
          'X-Custom': 'value',
        },
      });

      const embeddingModel = provider.textEmbeddingModel('test-embedding');
      expect(embeddingModel).toBeDefined();
    });

    it('should create image models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
      });

      const imageModel = provider.imageModel('test-image');
      expect(imageModel).toBeDefined();
    });

    it('should create video models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
      });

      const videoModel = provider.videoModel('test-video');
      expect(videoModel).toBeDefined();
    });

    it('should create audio models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
      });

      const audioModel = provider.audioModel('test-audio');
      expect(audioModel).toBeDefined();
    });

    it('should create moderation models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
      });

      const moderationModel = provider.moderationModel('test-moderation');
      expect(moderationModel).toBeDefined();
    });

    it('should create inference models with full configuration', () => {
      const provider = createChutes({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.chutes.ai',
      });

      const inferenceModel = provider.inferenceModel('test-inference');
      expect(inferenceModel).toBeDefined();
    });
  });
});

