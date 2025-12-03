import { describe, it, expect } from 'vitest';
import { createChutes } from '../../src';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Provider Methods Integration', () => {
  testIf('should work end-to-end: list models and get capabilities', async () => {
    const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
    
    // List all LLM models
    const llmModels = await chutes.listModels('llm');
    expect(llmModels.length).toBeGreaterThan(0);
    
    // Get capabilities for the first model
    const firstModel = llmModels[0];
    const capabilities = await chutes.getModelCapabilities(firstModel.slug);
    
    // Verify it has LLM capabilities
    expect(capabilities.chat).toBe(true);
    expect(capabilities.inputModalities).toContain('text');
    expect(capabilities.outputModalities).toContain('text');
    
    // Verify we can create a model with this slug
    const model = chutes(firstModel.slug, { chuteId: firstModel.chute_id });
    expect(model).toBeDefined();
  }, 30000);
  
  testIf('should handle different model types', async () => {
    const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
    
    const types = ['llm', 'image', 'embedding'];
    
    for (const type of types) {
      const models = await chutes.listModels(type);
      
      if (models.length > 0) {
        const capabilities = await chutes.getModelCapabilities(models[0].slug);
        
        // Verify capabilities match the type
        if (type === 'llm') {
          expect(capabilities.chat || capabilities.completion).toBe(true);
        } else if (type === 'image') {
          expect(capabilities.outputModalities).toContain('image');
        } else if (type === 'embedding') {
          expect(capabilities.outputModalities).toContain('embedding');
        }
      }
    }
  }, 45000);
});

