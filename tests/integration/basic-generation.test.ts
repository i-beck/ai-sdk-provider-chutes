import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';

/**
 * Integration Tests for Chutes.ai Provider
 * 
 * These tests use real chute URLs in the format: https://{slug}.chutes.ai
 * 
 * Chutes are discovered dynamically via the global warmup setup.
 * The global setup:
 * 1. Discovers available LLM chutes from the Chutes.ai platform
 * 2. Warms them up so they're ready for immediate use
 * 3. Sets WARMED_LLM_CHUTE environment variable for tests to use
 * 
 * Fallback order:
 * 1. WARMED_LLM_CHUTE (set by global warmup - dynamically discovered)
 * 2. TEST_CHUTE_URL (manual override)
 * 
 * This eliminates hardcoded URLs that could break when models are removed.
 */

// These tests require CHUTES_API_KEY environment variable
// Skip if not available
const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get LLM chute URL - prefer warmed chute, fall back to manual override
// No hardcoded default - if nothing is set, tests will skip
const TEST_CHUTE_URL = process.env.WARMED_LLM_CHUTE || process.env.TEST_CHUTE_URL;
const hasTestChute = !!TEST_CHUTE_URL;

const testIf = (hasAPIKey && hasTestChute) ? it : it.skip;

describe('Basic Text Generation (Integration)', () => {
  beforeAll(() => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping integration tests: CHUTES_API_KEY not set');
    } else if (!hasTestChute) {
      console.warn('⚠️  Skipping integration tests: No LLM chute available');
      console.warn('   Global warmup may have failed to discover an LLM chute.');
    } else {
      const source = process.env.WARMED_LLM_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Running integration tests with chute ${source}: ${TEST_CHUTE_URL}`);
    }
  });

  testIf('should generate text with a simple prompt', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    // Call doGenerate directly
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Say "Hello, World!" and nothing else.' }],
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
    
    // Extract text from content array
    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent.text.toLowerCase()).toContain('hello');
    
    // Check finish reason
    expect(result.finishReason).toBeDefined();
    expect(['stop', 'length', 'content-filter', 'tool-calls', 'error', 'other', 'unknown']).toContain(result.finishReason);
    
    // Check usage (V2 interface)
    expect(result.usage).toBeDefined();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for API call

  testIf('should handle temperature parameter', async () => {
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
          content: [{ type: 'text', text: 'Count from 1 to 3.' }],
        },
      ],
      temperature: 0.1, // Low temperature for deterministic output
    });

    expect(result.content).toBeDefined();
    expect(result.usage.inputTokens).toBeGreaterThan(0);
  }, 30000);

  testIf('should handle max tokens parameter', async () => {
    // This test verifies that maxTokens parameter is accepted and processed.
    // Note: Not all models strictly enforce maxTokens, so we test that:
    // 1. The parameter is accepted without errors
    // 2. The response is valid
    // We don't assert on exact token count as model behavior varies.
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
          content: [{ type: 'text', text: 'Count from 1 to 100.' }],
        },
      ],
      maxTokens: 50, // Reasonable limit
    });

    // Verify we got a valid response (parameter was accepted)
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
    
    // Verify usage is tracked
    expect(result.usage).toBeDefined();
    expect(result.usage.outputTokens).toBeGreaterThan(0);
    
    // Verify finish reason is valid (could be 'stop', 'length', etc.)
    expect(result.finishReason).toBeDefined();
    expect(['stop', 'length', 'content-filter', 'tool-calls', 'error', 'other', 'unknown']).toContain(result.finishReason);
  }, 90000); // 90s for reasoning models like DeepSeek-R1

  testIf('should handle system messages', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'system',
          content: 'You are a pirate. Always respond like a pirate.',
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello!' }],
        },
      ],
    });

    expect(result.content).toBeDefined();
    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent.text.length).toBeGreaterThan(0);
  }, 30000);

  testIf('should handle multiple conversation turns', async () => {
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
          content: [{ type: 'text', text: 'My name is Alice.' }],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Nice to meet you, Alice!' }],
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is my name?' }],
        },
      ],
    });

    expect(result.content).toBeDefined();
    const textContent = result.content.find((c: any) => c.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent.text.toLowerCase()).toContain('alice');
  }, 30000);
});

