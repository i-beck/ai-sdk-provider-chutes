/**
 * Global Test Warmup Setup
 * 
 * This file runs once before all tests to:
 * 1. Discover the chutes that integration tests will use
 * 2. Warm them up so they're ready for immediate use
 * 3. Share the chute URLs with test files via environment variables
 * 
 * This eliminates the need for hardcoded chute URLs and reduces test flakiness
 * caused by cold chutes.
 */

import { discoverTestChutes, warmupTestChutes, setTestChutes } from './test-chutes';

/**
 * Global setup function called by Vitest before all tests
 */
export async function setup() {
  const apiKey = process.env.CHUTES_API_KEY;
  
  if (!apiKey) {
    console.log('\n⏭️  No CHUTES_API_KEY - skipping global warmup');
    console.log('   Integration tests will be skipped.\n');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔥 GLOBAL TEST WARMUP');
  console.log('='.repeat(60));

  try {
    // Step 1: Discover chutes
    const config = await discoverTestChutes(apiKey);
    
    // Step 2: Warm them up
    await warmupTestChutes(config, apiKey);
    
    // Step 3: Store for test files to use
    setTestChutes(config);
    
    // Step 4: Also set environment variables for backward compatibility
    // This allows test files that still use process.env to work
    if (config.llm?.url) {
      process.env.WARMED_LLM_CHUTE = config.llm.url;
      process.env.WARMED_LLM_CHUTE_ID = config.llm.chuteId;
    }
    if (config.image?.url) {
      process.env.WARMED_IMAGE_CHUTE = config.image.url;
      process.env.WARMED_IMAGE_CHUTE_ID = config.image.chuteId;
    }
    if (config.t2v?.url) {
      process.env.WARMED_T2V_CHUTE = config.t2v.url;
      process.env.WARMED_T2V_CHUTE_ID = config.t2v.chuteId;
    }
    if (config.i2v?.url) {
      process.env.WARMED_I2V_CHUTE = config.i2v.url;
      process.env.WARMED_I2V_CHUTE_ID = config.i2v.chuteId;
      // Also set WARMED_VIDEO_CHUTE for backward compatibility
      process.env.WARMED_VIDEO_CHUTE = config.i2v.url;
      process.env.WARMED_VIDEO_CHUTE_ID = config.i2v.chuteId;
    }
    if (config.embedding?.url) {
      process.env.WARMED_EMBEDDING_CHUTE = config.embedding.url;
      process.env.WARMED_EMBEDDING_CHUTE_ID = config.embedding.chuteId;
    }
    if (config.tts?.url) {
      process.env.WARMED_TTS_CHUTE = config.tts.url;
      process.env.WARMED_TTS_CHUTE_ID = config.tts.chuteId;
    }
    if (config.stt?.url) {
      process.env.WARMED_STT_CHUTE = config.stt.url;
      process.env.WARMED_STT_CHUTE_ID = config.stt.chuteId;
    }

    // Summary
    const discoveredCount = Object.values(config).filter(Boolean).length;
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Warmup complete: ${discoveredCount} chute(s) ready`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Global warmup failed:', error);
    console.log('   Tests will continue but may experience cold start delays.\n');
    // Don't throw - let tests run anyway
  }
}

/**
 * Global teardown function called by Vitest after all tests
 */
export async function teardown() {
  // Clean up environment variables
  delete process.env.WARMED_LLM_CHUTE;
  delete process.env.WARMED_LLM_CHUTE_ID;
  delete process.env.WARMED_IMAGE_CHUTE;
  delete process.env.WARMED_IMAGE_CHUTE_ID;
  delete process.env.WARMED_T2V_CHUTE;
  delete process.env.WARMED_T2V_CHUTE_ID;
  delete process.env.WARMED_I2V_CHUTE;
  delete process.env.WARMED_I2V_CHUTE_ID;
  delete process.env.WARMED_VIDEO_CHUTE;
  delete process.env.WARMED_VIDEO_CHUTE_ID;
  delete process.env.WARMED_EMBEDDING_CHUTE;
  delete process.env.WARMED_EMBEDDING_CHUTE_ID;
  delete process.env.WARMED_TTS_CHUTE;
  delete process.env.WARMED_TTS_CHUTE_ID;
  delete process.env.WARMED_STT_CHUTE;
  delete process.env.WARMED_STT_CHUTE_ID;
  
  console.log('\n🧹 Global teardown complete\n');
}

