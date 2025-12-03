/**
 * Basic Chat Example
 * 
 * Demonstrates simple text generation with the Chutes.ai provider.
 * 
 * Usage:
 *   tsx examples/basic-chat.ts
 * 
 * Requirements:
 *   - CHUTES_API_KEY environment variable set
 *   - A valid chute URL (e.g., https://chutes-deepseek-ai-deepseek-v3.chutes.ai)
 */

import { createChutes } from '../src/index';
import { generateText } from 'ai';

async function main() {
  // Create the Chutes provider
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Use a chute URL - replace with your actual chute
  const model = chutes('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');

  console.log('🚀 Generating text with Chutes.ai...\n');

  // Generate text
  const result = await generateText({
    model,
    prompt: 'Write a haiku about artificial intelligence.',
  });

  console.log('📝 Response:');
  console.log(result.text);
  console.log('\n📊 Usage:');
  console.log(`- Prompt tokens: ${result.usage.promptTokens}`);
  console.log(`- Completion tokens: ${result.usage.completionTokens}`);
  console.log(`- Finish reason: ${result.finishReason}`);
}

main().catch(console.error);

