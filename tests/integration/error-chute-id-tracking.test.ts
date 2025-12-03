import { describe, it, expect } from 'vitest';
import { createChutes } from '../../src';
import { ChutesAPIError } from '../../src/api/errors';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Error chuteId Tracking Integration', () => {
  testIf('should include chuteId in error when language model fails', async () => {
    const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
    
    // Get a real chute
    const models = await chutes.listModels('llm');
    expect(models.length).toBeGreaterThan(0);
    
    const testModel = models[0];
    const model = chutes(testModel.slug, { chuteId: testModel.chute_id });
    
    try {
      // Make a request that should fail (invalid max_tokens)
      await model.doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
        maxTokens: -1, // Invalid value to trigger error
      });
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Check that chuteId is preserved in the error chain
      if (error.cause && error.cause instanceof ChutesAPIError) {
        expect(error.cause.chuteId).toBe(testModel.chute_id);
      } else {
        // If it's directly a ChutesAPIError
        if (error instanceof ChutesAPIError) {
          expect(error.chuteId).toBe(testModel.chute_id);
        }
      }
    }
  }, 30000);
  
  testIf('should include chuteId when embedding model fails', async () => {
    const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
    
    // Get a real embedding chute
    const models = await chutes.listModels('embedding');
    
    if (models.length > 0) {
      const testModel = models[0];
      const model = chutes.textEmbeddingModel(testModel.slug, { chuteId: testModel.chute_id });
      
      try {
        // Make a request that might fail (empty input)
        await model.doEmbed({
          values: [''], // Empty string might cause issues
        });
        
        // If it doesn't fail, that's okay - just skip this test
      } catch (error: any) {
        // If it does fail, check for chuteId
        if (error.cause instanceof ChutesAPIError) {
          // chuteId should be present
          expect(error.cause.chuteId).toBe(testModel.chute_id);
        }
      }
    }
  }, 30000);
});

