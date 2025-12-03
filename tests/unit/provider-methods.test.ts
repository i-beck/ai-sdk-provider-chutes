import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createChutes } from '../../src';
import type { ChuteInfo, ModelCapabilities } from '../../src';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Provider Methods', () => {
  describe('listModels()', () => {
    testIf('should return array of ChuteInfo objects', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const models = await chutes.listModels();
      
      expect(Array.isArray(models)).toBe(true);
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('chute_id');
        expect(models[0]).toHaveProperty('slug');
        expect(models[0]).toHaveProperty('name');
      }
    }, 15000);
    
    testIf('should filter by type when provided', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const llmModels = await chutes.listModels('llm');
      
      expect(Array.isArray(llmModels)).toBe(true);
      // All returned models should be LLM type
      for (const model of llmModels) {
        const template = model.standard_template?.toLowerCase();
        expect(
          template === 'vllm' || 
          model.name.toLowerCase().includes('llama') ||
          model.name.toLowerCase().includes('deepseek')
        ).toBe(true);
      }
    }, 15000);
    
    testIf('should return all models when no filter provided', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const allModels = await chutes.listModels();
      const llmModels = await chutes.listModels('llm');
      
      expect(allModels.length).toBeGreaterThanOrEqual(llmModels.length);
    }, 15000);
  });
  
  describe('getModelCapabilities()', () => {
    testIf('should return capabilities for a chute by slug', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const models = await chutes.listModels('llm');
      
      if (models.length > 0) {
        const capabilities = await chutes.getModelCapabilities(models[0].slug);
        
        expect(capabilities).toHaveProperty('chat');
        expect(capabilities).toHaveProperty('streaming');
        expect(capabilities).toHaveProperty('contextWindow');
        expect(capabilities).toHaveProperty('inputModalities');
        expect(capabilities).toHaveProperty('outputModalities');
      }
    }, 15000);
    
    testIf('should return capabilities for a chute by URL', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const models = await chutes.listModels('llm');
      
      if (models.length > 0) {
        const chuteUrl = `https://${models[0].slug}.chutes.ai`;
        const capabilities = await chutes.getModelCapabilities(chuteUrl);
        
        expect(capabilities).toHaveProperty('chat');
        expect(capabilities.chat).toBe(true); // LLM should support chat
      }
    }, 15000);
    
    testIf('should return capabilities for a chute by chute_id', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const models = await chutes.listModels('llm');
      
      if (models.length > 0) {
        const capabilities = await chutes.getModelCapabilities(models[0].chute_id);
        
        expect(capabilities).toHaveProperty('chat');
        expect(capabilities).toHaveProperty('streaming');
      }
    }, 15000);
  });
});

