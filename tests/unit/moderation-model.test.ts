import { describe, it, expect } from 'vitest';
import { ModerationModel } from '../../src/models/moderation-model';

describe('ModerationModel', () => {
  describe('Type Definition', () => {
    it('should export ModerationModel class', () => {
      expect(ModerationModel).toBeDefined();
      expect(typeof ModerationModel).toBe('function');
    });

    it('should instantiate with required configuration', () => {
      const model = new ModerationModel({
        chuteId: 'moderation-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model).toBeInstanceOf(ModerationModel);
      expect(model.modelId).toBe('moderation-test-chute');
      expect(model.provider).toBe('chutes');
    });

    it('should have analyzeContent method', () => {
      const model = new ModerationModel({
        chuteId: 'moderation-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.analyzeContent).toBeDefined();
      expect(typeof model.analyzeContent).toBe('function');
    });
  });

  describe('Type Interfaces', () => {
    it('should accept ModerationSettings in configuration', () => {
      const model = new ModerationModel({
        chuteId: 'moderation-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        categories: ['hate', 'violence', 'sexual'],
      });
      
      expect(model).toBeInstanceOf(ModerationModel);
    });
  });
});

