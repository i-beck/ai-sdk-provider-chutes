#!/usr/bin/env node
/**
 * Automated test for Next.js API route using Chutes.ai provider
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root (two levels up: tests/test-nextjs -> root)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

console.log('🧪 Testing Chutes.ai Provider in Next.js API Route...\n');

async function testAPIRoute() {
  const API_URL = process.env.TEST_API_URL || 'http://localhost:3000/api/chat';
  
  console.log('Test Configuration:');
  console.log('  - API URL:', API_URL);
  console.log('  - CHUTES_API_KEY:', process.env.CHUTES_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('');
  
  if (!process.env.CHUTES_API_KEY) {
    console.error('❌ CHUTES_API_KEY not found in environment');
    console.log('   Please ensure .env file exists in parent directory with CHUTES_API_KEY');
    process.exit(1);
  }

  // Test 1: Simple message
  console.log('Test 1: Sending a simple message...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Say "Hello from Next.js!" and nothing else.' }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:', response.status, response.statusText);
      console.error('   Response:', errorText);
      process.exit(1);
    }

    // Check if response is streaming
    if (!response.body) {
      console.error('❌ No response body received');
      process.exit(1);
    }

    const contentType = response.headers.get('content-type');
    console.log('   - Response Content-Type:', contentType);
    console.log('   - Response Status:', response.status);

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let chunks = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      chunks++;
    }

    console.log('✅ Streaming response received');
    console.log('   - Chunks received:', chunks);
    console.log('   - Total response length:', fullText.length, 'bytes');
    console.log('   - Response preview:', fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Connection refused. Is the Next.js dev server running?');
      console.log('   Start it with: npm run dev');
      console.log('   Or test the build: npm run build && npm start');
    }
    process.exit(1);
  }

  console.log('\n🎉 Next.js API route test passed! Package works correctly in Next.js environment.');
}

testAPIRoute().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

