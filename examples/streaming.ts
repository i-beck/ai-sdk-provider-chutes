/**
 * Streaming Example
 * 
 * Demonstrates real-time streaming text generation with the Chutes.ai provider.
 * 
 * Usage:
 *   tsx examples/streaming.ts
 * 
 * Requirements:
 *   - CHUTES_API_KEY environment variable set
 *   - A valid chute URL
 */

import { createChutes } from '../src/index';
import { streamText } from 'ai';

async function main() {
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  const model = chutes('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');

  console.log('🚀 Streaming text with Chutes.ai...\n');
  console.log('📝 Response (streaming):\n');

  const result = streamText({
    model,
    prompt: 'Explain quantum computing in simple terms.',
    temperature: 0.7,
  });

  // Stream the response character by character
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  // Get final usage stats
  const usage = await result.usage;
  console.log('\n\n📊 Usage:');
  console.log(`- Prompt tokens: ${usage.promptTokens}`);
  console.log(`- Completion tokens: ${usage.completionTokens}`);
}

main().catch(console.error);

