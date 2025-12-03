/**
 * Next.js API Route for testing Chutes.ai provider
 * This demonstrates the package working in a real Next.js environment
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';
import { streamText } from 'ai';

// Enable Edge Runtime (optional, for better performance)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Create Chutes provider instance
    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    // Use a Chutes model
    const model = chutes('https://chutes-deepseek-ai-deepseek-v3.chutes.ai');

    // Stream the response
    const result = streamText({
      model,
      messages,
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

