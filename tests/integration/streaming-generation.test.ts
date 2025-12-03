import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';

/**
 * Integration Tests for Streaming Text Generation
 * 
 * Tests the streaming capability using Server-Sent Events (SSE)
 * with real Chutes.ai chutes.
 * 
 * LLM chutes are discovered dynamically via global warmup.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get LLM chute URL - prefer warmed chute, fall back to manual override
const TEST_CHUTE_URL = process.env.WARMED_LLM_CHUTE || process.env.TEST_CHUTE_URL;
const hasTestChute = !!TEST_CHUTE_URL;

const testIf = (hasAPIKey && hasTestChute) ? it : it.skip;

describe('Streaming Text Generation (Integration)', () => {
  beforeAll(() => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping streaming tests: CHUTES_API_KEY not set');
    } else if (!hasTestChute) {
      console.warn('⚠️  Skipping streaming tests: No LLM chute available');
    } else {
      const source = process.env.WARMED_LLM_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Running streaming tests with chute ${source}: ${TEST_CHUTE_URL}`);
    }
  });

  testIf('should stream text generation in chunks', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    // Call doStream method - returns { stream: ReadableStream, ... }
    const result = await model.doStream({
      inputFormat: 'prompt',
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Count from 1 to 5, one number per line.' }],
        },
      ],
    });

    // Collect chunks from ReadableStream (V2)
    const chunks: any[] = [];
    const reader = result.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Should have received multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Should have text chunks (V2 format uses 'delta' not 'textDelta')
    const hasTextChunks = chunks.some(chunk => 
      chunk.type === 'text-delta' && chunk.delta && chunk.delta.length > 0
    );
    expect(hasTextChunks).toBe(true);

    // Should have a finish chunk
    const finishChunk = chunks.find(chunk => chunk.type === 'finish');
    expect(finishChunk).toBeDefined();
    expect(finishChunk.finishReason).toBeDefined();
    expect(finishChunk.usage).toBeDefined();
  }, 60000); // 60s for reasoning models like DeepSeek-R1

  testIf('should handle streaming with temperature', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doStream({
      inputFormat: 'prompt',
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Say hello' }],
        },
      ],
      temperature: 0.3,
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    expect(chunks.length).toBeGreaterThan(0);
  }, 60000); // 60s for reasoning models like DeepSeek-R1

  testIf('should handle streaming with max tokens', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doStream({
      inputFormat: 'prompt',
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Write a long story about a robot' }],
        },
      ],
      maxOutputTokens: 50, // Limit to 50 tokens (V2 uses maxOutputTokens)
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Should have received chunks
    expect(chunks.length).toBeGreaterThan(0);

    // Should have a finish chunk
    const finishChunk = chunks.find(chunk => chunk.type === 'finish');
    expect(finishChunk).toBeDefined();
    
    // Finish reason might be 'length' due to max tokens limit
    expect(['stop', 'length']).toContain(finishChunk.finishReason);
  });

  testIf('should stream with system message', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const result = await model.doStream({
      inputFormat: 'prompt',
      prompt: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Be brief.',
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'Say hi in one word.' }],
        },
      ],
      maxTokens: 50, // Limit tokens for faster response
    });

    let fullText = '';
    const reader = result.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === 'text-delta') {
          fullText += value.delta; // V2 uses 'delta' not 'textDelta'
        }
      }
    } finally {
      reader.releaseLock();
    }

    expect(fullText.length).toBeGreaterThan(0);
  }, 60000); // Extended timeout for reasoning models like DeepSeek-R1
});

