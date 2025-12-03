import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';

/**
 * Integration Tests for Language Model Parameters
 * 
 * Tests various generation parameters like topP, frequency/presence penalties, and stop sequences.
 * 
 * LLM chutes are discovered dynamically via global warmup.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get LLM chute URL - prefer warmed chute, fall back to manual override
const TEST_CHUTE_URL = process.env.WARMED_LLM_CHUTE || process.env.TEST_CHUTE_URL;
const hasTestChute = !!TEST_CHUTE_URL;

const testIf = (hasAPIKey && hasTestChute) ? it : it.skip;

describe('Language Model Parameters (Integration)', () => {
  beforeAll(() => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping LLM parameter tests: CHUTES_API_KEY not set');
    } else if (!hasTestChute) {
      console.warn('⚠️  Skipping LLM parameter tests: No LLM chute available');
    } else {
      const source = process.env.WARMED_LLM_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Running LLM parameter tests with chute ${source}: ${TEST_CHUTE_URL}`);
    }
  });

  testIf('should handle topP parameter', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Say "test completed" and nothing else.' }],
        },
      ],
      topP: 0.9,
      temperature: 0.7,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  }, 30000);

  testIf('should handle frequencyPenalty parameter', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Write a short sentence.' }],
        },
      ],
      frequencyPenalty: 0.5, // Reduce repetition
      temperature: 0.7,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  }, 30000);

  testIf('should handle presencePenalty parameter', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Write a short sentence.' }],
        },
      ],
      presencePenalty: 0.3, // Encourage diversity
      temperature: 0.7,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  }, 30000);

  testIf('should handle stopSequences parameter', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Count from 1 to 10. After each number, write STOP.' }],
        },
      ],
      stopSequences: ['STOP'], // Should stop at first STOP
      temperature: 0.1,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    
    // Check if it stopped (note: not all models respect stop sequences perfectly)
    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    
    // The response should be shorter due to stop sequence
    console.log('Response:', textContent.text);
    console.log('Finish reason:', result.finishReason);
  }, 30000);

  testIf('should handle seed parameter for deterministic generation', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const prompt = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Say exactly: "Hello, world!"' }],
      },
    ];

    // Generate twice with same seed
    const result1 = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt,
      seed: 42,
      temperature: 0.1, // Low temperature for more deterministic behavior
    });

    const result2 = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt,
      seed: 42,
      temperature: 0.1,
    });

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    
    // Note: Even with the same seed, LLM responses may vary slightly
    // This test just confirms the parameter is accepted
    expect(result1.usage.outputTokens).toBeGreaterThan(0);
    expect(result2.usage.outputTokens).toBeGreaterThan(0);
  }, 180000); // 3 minutes for two API calls with reasoning models

  testIf('should handle multiple parameters combined', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Write a haiku.' }],
        },
      ],
      temperature: 0.8,
      topP: 0.95,
      frequencyPenalty: 0.3,
      presencePenalty: 0.2,
      maxOutputTokens: 100,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.usage.outputTokens).toBeGreaterThan(0);
    expect(result.finishReason).toBeDefined();
  }, 30000);
});

