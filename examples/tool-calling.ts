/**
 * Tool Calling Example
 * 
 * Demonstrates function/tool calling with the Chutes.ai provider.
 * 
 * Usage:
 *   tsx examples/tool-calling.ts
 * 
 * Requirements:
 *   - CHUTES_API_KEY environment variable set
 *   - A chute URL for a model that supports tool calling
 */

import { createChutes } from '../src/index';
import { generateText, tool } from 'ai';
import { z } from 'zod';

async function main() {
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  const model = chutes('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');

  console.log('🚀 Demonstrating tool calling with Chutes.ai...\n');

  // Define a simple weather tool
  const weatherTool = tool({
    description: 'Get the current weather for a location',
    parameters: z.object({
      location: z.string().describe('The city name, e.g., "San Francisco"'),
      unit: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
    }),
    execute: async ({ location, unit }) => {
      // Simulate weather API call
      const temp = Math.round(Math.random() * 30 + 10);
      return {
        location,
        temperature: temp,
        unit,
        conditions: 'Partly cloudy',
      };
    },
  });

  // Call the model with a tool
  const result = await generateText({
    model,
    prompt: 'What is the weather like in Tokyo?',
    tools: {
      getWeather: weatherTool,
    },
    maxSteps: 3, // Allow multiple tool calls if needed
  });

  console.log('📝 Final Response:');
  console.log(result.text);

  // Show tool calls if any
  if (result.toolCalls && result.toolCalls.length > 0) {
    console.log('\n🔧 Tool Calls Made:');
    result.toolCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.toolName}(${JSON.stringify(call.args)})`);
    });
  }

  // Show tool results if any
  if (result.toolResults && result.toolResults.length > 0) {
    console.log('\n📦 Tool Results:');
    result.toolResults.forEach((res, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(res.result)}`);
    });
  }

  console.log('\n📊 Usage:');
  console.log(`- Prompt tokens: ${result.usage.promptTokens}`);
  console.log(`- Completion tokens: ${result.usage.completionTokens}`);
}

main().catch(console.error);

