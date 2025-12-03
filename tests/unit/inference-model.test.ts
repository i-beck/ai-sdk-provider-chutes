import { describe, it, expect } from 'vitest';
import { InferenceModel } from '../../src/models/inference-model';

describe('InferenceModel', () => {
  describe('Type Definition', () => {
    it('should export InferenceModel class', () => {
      expect(InferenceModel).toBeDefined();
      expect(typeof InferenceModel).toBe('function');
    });

    it('should instantiate with required configuration', () => {
      const model = new InferenceModel({
        chuteId: 'inference-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model).toBeInstanceOf(InferenceModel);
      expect(model.modelId).toBe('inference-test-chute');
      expect(model.provider).toBe('chutes');
    });

    it('should have predict method', () => {
      const model = new InferenceModel({
        chuteId: 'inference-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.predict).toBeDefined();
      expect(typeof model.predict).toBe('function');
    });

    it('should have batch method', () => {
      const model = new InferenceModel({
        chuteId: 'inference-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.batch).toBeDefined();
      expect(typeof model.batch).toBe('function');
    });

    it('should have getStatus method', () => {
      const model = new InferenceModel({
        chuteId: 'inference-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.getStatus).toBeDefined();
      expect(typeof model.getStatus).toBe('function');
    });
  });

  describe('Type Interfaces', () => {
    it('should accept InferenceSettings in configuration', () => {
      const model = new InferenceModel({
        chuteId: 'inference-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        webhookUrl: 'https://example.com/webhook',
        priority: 'high',
        outputFormat: 'json',
      });
      
      expect(model).toBeInstanceOf(InferenceModel);
    });
  });
});

