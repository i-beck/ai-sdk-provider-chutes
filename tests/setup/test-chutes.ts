/**
 * Test Chutes Module
 * 
 * Provides functionality to discover and warm up chutes for integration tests.
 * This module is used by the global test setup to ensure tests run against hot chutes.
 */

import { discoverChutes, filterChutesByType, getChuteUrl, findFirstChuteByType } from '../../src/utils/chute-discovery';
import { warmUpChute, type WarmupResult } from '../../src/utils/therm';

/**
 * Information about a single test chute
 */
export interface TestChuteInfo {
  /** The chute UUID */
  chuteId: string;
  /** The full URL to access the chute */
  url: string;
  /** Human-readable name */
  name: string;
  /** Whether the chute is currently hot */
  isHot?: boolean;
  /** Number of available instances */
  instanceCount?: number;
}

/**
 * Configuration for all test chutes
 */
export interface TestChuteConfig {
  /** LLM chute for text generation tests */
  llm?: TestChuteInfo;
  /** Image generation chute */
  image?: TestChuteInfo;
  /** Text-to-Video chute (T2V) */
  t2v?: TestChuteInfo;
  /** Image-to-Video chute (I2V) */
  i2v?: TestChuteInfo;
  /** Embedding chute */
  embedding?: TestChuteInfo;
  /** TTS chute */
  tts?: TestChuteInfo;
  /** STT chute */
  stt?: TestChuteInfo;
}

/**
 * Result of warming up a chute
 */
export interface WarmupTestResult {
  success: boolean;
  isHot?: boolean;
  instanceCount?: number;
  error?: string;
  skipped?: boolean;
}

/**
 * Results from warming up all test chutes
 */
export interface WarmupTestResults {
  llm?: WarmupTestResult;
  image?: WarmupTestResult;
  t2v?: WarmupTestResult;
  i2v?: WarmupTestResult;
  embedding?: WarmupTestResult;
  tts?: WarmupTestResult;
  stt?: WarmupTestResult;
}

/**
 * Options for warming up chutes
 */
export interface WarmupOptions {
  /** Skip warmup for chutes that are already hot */
  skipIfHot?: boolean;
}

// In-memory storage for discovered chutes (shared across test files)
let cachedTestChutes: TestChuteConfig | undefined;

/**
 * Discover chutes for each test type
 * 
 * @param apiKey - The Chutes API key
 * @returns Configuration with discovered chutes for each type
 */
export async function discoverTestChutes(apiKey: string): Promise<TestChuteConfig> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required for chute discovery');
  }

  console.log('🔍 Discovering chutes for integration tests...');
  
  const allChutes = await discoverChutes(apiKey);
  const config: TestChuteConfig = {};

  // Discover LLM chute
  const llmChutes = filterChutesByType(allChutes, 'llm');
  if (llmChutes.length > 0) {
    const chute = llmChutes[0];
    config.llm = {
      chuteId: chute.chute_id,
      url: getChuteUrl(chute.slug),
      name: chute.name,
    };
    console.log(`   ✓ LLM: ${chute.name} (${chute.chute_id})`);
  } else {
    console.log('   ⚠ No LLM chutes found');
  }

  // Discover image chute
  const imageChutes = filterChutesByType(allChutes, 'image');
  if (imageChutes.length > 0) {
    const chute = imageChutes[0];
    config.image = {
      chuteId: chute.chute_id,
      url: getChuteUrl(chute.slug),
      name: chute.name,
    };
    console.log(`   ✓ Image: ${chute.name} (${chute.chute_id})`);
  } else {
    console.log('   ⚠ No image chutes found');
  }

  // Discover video chutes - find BOTH T2V (text-to-video) and I2V (image-to-video)
  const videoChutes = filterChutesByType(allChutes, 'video');
  
  // Helper to detect chute type
  const isI2VChute = (url: string): boolean => {
    const name = url.toLowerCase();
    return name.includes('i2v') || 
           name.includes('image-to-video') ||
           name.includes('img2vid') ||
           name.includes('wan');
  };
  
  const isT2VChute = (url: string): boolean => {
    const name = url.toLowerCase();
    return name.includes('t2v') || 
           name.includes('text-to-video') ||
           name.includes('txt2vid') ||
           name.includes('mochi') ||
           name.includes('hunyuan');
  };

  // Find T2V chute
  for (const chute of videoChutes) {
    const url = getChuteUrl(chute.slug);
    if (isT2VChute(url)) {
      config.t2v = {
        chuteId: chute.chute_id,
        url: url,
        name: chute.name,
      };
      console.log(`   ✓ T2V (Text-to-Video): ${chute.name} (${chute.chute_id})`);
      break;
    }
  }
  if (!config.t2v) {
    console.log('   ⚠ No Text-to-Video (T2V) chutes found');
  }

  // Find I2V chute
  for (const chute of videoChutes) {
    const url = getChuteUrl(chute.slug);
    if (isI2VChute(url)) {
      config.i2v = {
        chuteId: chute.chute_id,
        url: url,
        name: chute.name,
      };
      console.log(`   ✓ I2V (Image-to-Video): ${chute.name} (${chute.chute_id})`);
      break;
    }
  }
  if (!config.i2v) {
    console.log('   ⚠ No Image-to-Video (I2V) chutes found');
  }

  // Discover embedding chute - use findFirstChuteByType to verify endpoint exists
  // This is important because some chutes don't have /v1/embeddings endpoint
  const embeddingUrl = await findFirstChuteByType(apiKey, 'embedding', true);
  if (embeddingUrl) {
    // Find the matching chute info to get the ID
    const embeddingChutes = filterChutesByType(allChutes, 'embedding');
    const matchingChute = embeddingChutes.find(c => getChuteUrl(c.slug) === embeddingUrl);
    if (matchingChute) {
      config.embedding = {
        chuteId: matchingChute.chute_id,
        url: embeddingUrl,
        name: matchingChute.name,
      };
      console.log(`   ✓ Embedding: ${matchingChute.name} (${matchingChute.chute_id})`);
    }
  } else {
    console.log('   ⚠ No available embedding chutes found');
  }

  // Discover TTS chute
  const ttsChutes = filterChutesByType(allChutes, 'tts');
  if (ttsChutes.length > 0) {
    const chute = ttsChutes[0];
    config.tts = {
      chuteId: chute.chute_id,
      url: getChuteUrl(chute.slug),
      name: chute.name,
    };
    console.log(`   ✓ TTS: ${chute.name} (${chute.chute_id})`);
  } else {
    console.log('   ⚠ No TTS chutes found');
  }

  // Discover STT chute
  const sttChutes = filterChutesByType(allChutes, 'stt');
  if (sttChutes.length > 0) {
    const chute = sttChutes[0];
    config.stt = {
      chuteId: chute.chute_id,
      url: getChuteUrl(chute.slug),
      name: chute.name,
    };
    console.log(`   ✓ STT: ${chute.name} (${chute.chute_id})`);
  } else {
    console.log('   ⚠ No STT chutes found');
  }

  return config;
}

/**
 * Warm up all discovered test chutes
 * 
 * @param config - The test chute configuration
 * @param apiKey - The Chutes API key
 * @param warmupFn - Optional custom warmup function (for testing)
 * @param options - Warmup options
 * @returns Results for each chute warmup
 */
export async function warmupTestChutes(
  config: TestChuteConfig,
  apiKey: string,
  warmupFn?: (chuteId: string, apiKey: string) => Promise<WarmupResult>,
  options: WarmupOptions = {}
): Promise<WarmupTestResults> {
  const results: WarmupTestResults = {};
  const doWarmup = warmupFn ?? warmUpChute;

  const chuteTypes: (keyof TestChuteConfig)[] = ['llm', 'image', 't2v', 'i2v', 'embedding', 'tts', 'stt'];

  console.log('\n🔥 Warming up test chutes...');

  for (const type of chuteTypes) {
    const chute = config[type];
    if (!chute) continue;

    // Skip if already hot and option is set
    if (options.skipIfHot && chute.isHot) {
      console.log(`   ⏭ ${type.toUpperCase()}: ${chute.name} (already hot)`);
      results[type] = { success: true, skipped: true, isHot: true };
      continue;
    }

    try {
      console.log(`   🔄 ${type.toUpperCase()}: ${chute.name}...`);
      const warmupResult = await doWarmup(chute.chuteId, apiKey);
      
      results[type] = {
        success: warmupResult.success,
        isHot: (warmupResult as any).isHot ?? warmupResult.success,
        instanceCount: (warmupResult as any).instanceCount,
      };

      // Update chute info with warmup status
      chute.isHot = results[type]?.isHot;
      chute.instanceCount = results[type]?.instanceCount;

      if (results[type]?.isHot) {
        console.log(`   ✅ ${type.toUpperCase()}: Hot! ${results[type]?.instanceCount ?? '?'} instance(s)`);
      } else {
        console.log(`   ⏳ ${type.toUpperCase()}: Warming (status: ${(warmupResult as any).status ?? 'unknown'})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ ${type.toUpperCase()}: Failed - ${errorMessage}`);
      results[type] = {
        success: false,
        error: errorMessage,
      };
    }
  }

  return results;
}

/**
 * Get the cached test chute configuration
 * 
 * @returns The cached configuration or undefined if not set
 */
export function getTestChutes(): TestChuteConfig | undefined {
  return cachedTestChutes;
}

/**
 * Set the test chute configuration
 * 
 * @param config - The configuration to cache
 */
export function setTestChutes(config: TestChuteConfig): void {
  cachedTestChutes = config;
}

/**
 * Clear the cached test chute configuration
 */
export function clearTestChutes(): void {
  cachedTestChutes = undefined;
}

/**
 * Get a specific test chute URL, with fallback to environment variable
 * 
 * @param type - The type of chute to get
 * @param envFallback - Environment variable name to fallback to
 * @returns The chute URL or undefined
 */
export function getTestChuteUrl(
  type: keyof TestChuteConfig,
  envFallback?: string
): string | undefined {
  // First check cached chutes
  const cachedUrl = cachedTestChutes?.[type]?.url;
  if (cachedUrl) return cachedUrl;

  // Then check environment variable
  if (envFallback) {
    const envUrl = process.env[envFallback];
    if (envUrl) return envUrl;
  }

  return undefined;
}

/**
 * Get a specific test chute ID
 * 
 * @param type - The type of chute to get
 * @returns The chute ID or undefined
 */
export function getTestChuteId(type: keyof TestChuteConfig): string | undefined {
  return cachedTestChutes?.[type]?.chuteId;
}

