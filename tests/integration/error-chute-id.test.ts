/**
 * Integration tests for Chute ID propagation in errors
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Error Chute ID Propagation (Integration)', () => {
  beforeAll(() => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping: CHUTES_API_KEY not set');
    }
  });

  testIf('should include chuteId when provided in settings', async () => {
    const chutes = createChutes({
      apiKey: 'invalid-api-key-for-testing',
    });

    // When using a direct URL, provide the chute ID manually via settings
    const testChuteId = 'abc-123-test-chute-id';
    const model = chutes('https://chutes-deepseek-ai-deepseek-v3.chutes.ai', {
      chuteId: testChuteId,
    });

    let caughtError: any;
    try {
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      caughtError = error;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.cause).toBeDefined();
    
    console.log('Error cause chute ID:', caughtError.cause?.chuteId);
    
    // The chute ID should be present in the error when provided via settings
    expect(caughtError.cause.chuteId).toBe(testChuteId);
  }, 10000);

  testIf('should include chuteId when using discovered chute', async () => {
    const { discoverChutes, filterChutesByType } = await import('../../src/utils/chute-discovery');
    
    const apiKey = process.env.CHUTES_API_KEY!;
    const allChutes = await discoverChutes(apiKey);
    const llmChutes = filterChutesByType(allChutes, 'llm');
    
    if (llmChutes.length === 0) {
      console.warn('⚠️  No LLM chutes available, skipping test');
      return;
    }

    const testChute = llmChutes[0];
    console.log('Testing with chute:', testChute.slug, 'ID:', testChute.chute_id);

    const chutes = createChutes({
      apiKey: 'invalid-api-key-for-testing',
    });

    // Pass the chute_id via settings
    const model = chutes(testChute.slug, { chuteId: testChute.chute_id });

    let caughtError: any;
    try {
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      caughtError = error;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.cause).toBeDefined();
    
    // This should include the chute_id from discovery
    console.log('Discovered chute_id:', testChute.chute_id);
    console.log('Error cause chute ID:', caughtError.cause?.chuteId);
    
    // Now this should pass (GREEN phase)
    expect(caughtError.cause.chuteId).toBe(testChute.chute_id);
  }, 30000);
});

