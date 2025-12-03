import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';
import { retryOnFailure } from './test-helpers';

/**
 * Integration Tests for Tool/Function Calling
 * 
 * Tests the ability to define tools and have the model invoke them.
 * 
 * LLM chutes are discovered dynamically via global warmup.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get LLM chute URL - prefer warmed chute, fall back to manual override
const TEST_CHUTE_URL = process.env.WARMED_LLM_CHUTE || process.env.TEST_CHUTE_URL;
const hasTestChute = !!TEST_CHUTE_URL;

const testIf = (hasAPIKey && hasTestChute) ? it : it.skip;

describe('Tool Calling (Integration)', () => {
  beforeAll(() => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping tool calling tests: CHUTES_API_KEY not set');
    } else if (!hasTestChute) {
      console.warn('⚠️  Skipping tool calling tests: No LLM chute available');
    } else {
      const source = process.env.WARMED_LLM_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Running tool calling tests with chute ${source}: ${TEST_CHUTE_URL}`);
    }
  });

  testIf('should call a simple function tool', async () => {
    // Retry on failure - LLM tool calling can be non-deterministic
    // This makes the test CI/CD friendly while still testing real API behavior
    await retryOnFailure(async () => {
      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const model = chutes(TEST_CHUTE_URL);
      
      // Define a weather tool
      const tools = [
        {
          type: 'function' as const,
          name: 'get_weather',
          description: 'Get the current weather in a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city name, e.g. San Francisco',
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The temperature unit',
              },
            },
            required: ['location'],
          },
        },
      ];

      const result = await model.doGenerate({
        inputFormat: 'prompt',
        tools, // V2: tools is a direct parameter, not under mode
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'What is the weather in San Francisco?' }],
          },
        ],
      });

      // Should have tool call in response
      // Note: Some models return 'stop' even when tool calls are present
      expect(['stop', 'tool-calls']).toContain(result.finishReason);
      
      // Extract tool calls from content array (V2 interface)
      const toolCalls = result.content.filter((c: any) => c.type === 'tool-call');
      expect(toolCalls).toBeDefined();
      expect(toolCalls.length).toBeGreaterThan(0);

      // Check tool call structure
      const toolCall = toolCalls[0];
      expect(toolCall.toolName).toBe('get_weather');
      const args = JSON.parse(toolCall.input);
      expect(args).toBeDefined();
      expect(args.location).toContain('San Francisco');
    }, 3, 2000, 30000); // Retry up to 3 times, 2s delay, 30s per-attempt timeout
  }, 120000); // 120 second total timeout (3 attempts × 30s + delays)

  testIf('should handle tool call with multiple parameters', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const tools = [
      {
        type: 'function' as const,
        name: 'calculate',
        description: 'Perform mathematical calculations. You MUST use this tool for any mathematical operations.',
        parameters: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'The operation to perform',
            },
            a: {
              type: 'number',
              description: 'First number',
            },
            b: {
              type: 'number',
              description: 'Second number',
            },
          },
          required: ['operation', 'a', 'b'],
        },
      },
    ];

    const result = await model.doGenerate({
      inputFormat: 'prompt',
      tools, // V2: tools is a direct parameter, not under mode
      prompt: [
        {
          role: 'system',
          content: [{ 
            type: 'text', 
            text: 'You are a helpful assistant. You MUST use the calculate function for ALL mathematical operations. Never compute math yourself - always call the calculate tool.' 
          }],
        },
        {
          role: 'user',
          content: [{ type: 'text', text: 'Use the calculate tool to multiply 15 by 7.' }],
        },
      ],
    });

    // Note: Some models return 'stop' even when tool calls are present
    expect(['stop', 'tool-calls']).toContain(result.finishReason);
    
    // Extract tool calls from content array (V2 interface)
    const toolCalls = result.content.filter((c: any) => c.type === 'tool-call');
    expect(toolCalls.length).toBeGreaterThan(0);

    const toolCall = toolCalls[0];
    const args = JSON.parse(toolCall.input);
    expect(toolCall.toolName).toBe('calculate');
    expect(args.operation).toBe('multiply');
    expect(args.a).toBe(15);
    expect(args.b).toBe(7);
  }, 10000); // 10 second timeout

  testIf('should handle tool result in conversation', async () => {
    // Testing the full tool calling conversation flow: question → tool call → tool result → final answer
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const tools = [
      {
        type: 'function' as const,
        name: 'get_weather',
        description: 'Get the current weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
      },
    ];

    // First call - model should request tool
    const firstResult = await model.doGenerate({
      inputFormat: 'prompt',
      tools, // V2: tools is a direct parameter
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is the weather in Tokyo?' }],
        },
      ],
    });

    // Extract tool calls from content (V2 interface)
    const firstToolCalls = firstResult.content.filter((c: any) => c.type === 'tool-call');
    expect(firstToolCalls.length).toBeGreaterThan(0);
    const toolCall = firstToolCalls[0];

    // Second call - provide tool result
    // Note: Chutes API expects tool results directly after user message,
    // WITHOUT echoing back the assistant's tool call message
    const secondResult = await model.doGenerate({
      inputFormat: 'prompt',
      tools, // V2: tools is a direct parameter
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is the weather in Tokyo?' }],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              result: { temperature: 22, condition: 'Sunny' },
            },
          ],
        },
      ],
    });

    // Should have text or tool-call response using the tool result
    // Note: Reasoning models like DeepSeek-R1 might make more tool calls
    // instead of returning a final text answer, so we accept both
    expect(['stop', 'tool-calls']).toContain(secondResult.finishReason);
    
    // Check for either text response or continued tool calls
    const secondText = secondResult.content.find((c: any) => c.type === 'text');
    const secondToolCalls = secondResult.content.filter((c: any) => c.type === 'tool-call');
    
    // Should have either text or tool calls
    expect(secondText || secondToolCalls.length > 0).toBeTruthy();
    
    // If we got text, it should mention the weather data
    if (secondText && secondText.text.length > 0) {
      expect(secondText.text.toLowerCase()).toMatch(/sunny|22|temperature|weather|tokyo/i);
    }
  }, 90000); // 90 second timeout for reasoning models

  testIf('should handle multiple tool calls in one response', async () => {
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const model = chutes(TEST_CHUTE_URL);
    
    const tools = [
      {
        type: 'function' as const,
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
      },
    ];

    const result = await model.doGenerate({
      inputFormat: 'prompt',
      tools, // V2: tools is a direct parameter, not under mode
      prompt: [
        {
          role: 'user',
          content: [{ 
            type: 'text', 
            text: 'What is the weather in London and Paris? Use separate tool calls.' 
          }],
        },
      ],
    });

    // Model might call the tool twice (once for each city)
    // Extract tool calls from content array (V2 interface)
    const toolCalls = result.content.filter((c: any) => c.type === 'tool-call');
    expect(toolCalls.length).toBeGreaterThanOrEqual(1);
    
    if (toolCalls.length >= 2) {
      expect(toolCalls[0].toolName).toBe('get_weather');
      expect(toolCalls[1].toolName).toBe('get_weather');
    }
  }, 90000); // 90 second timeout for reasoning models
});

