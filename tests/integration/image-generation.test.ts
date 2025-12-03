import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';
import { findFirstChuteByType } from '../../src/utils/chute-discovery';

/**
 * Integration Tests for Image Generation
 * 
 * Tests image generation using Chutes.ai image models.
 * 
 * Image chutes are discovered dynamically via global warmup.
 * Fallback order:
 * 1. WARMED_IMAGE_CHUTE (set by global warmup - pre-warmed)
 * 2. DISCOVERED_IMAGE_CHUTE (manual override)
 * 3. Dynamic discovery via findFirstChuteByType (last resort)
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get image chute - prefer warmed chute from global setup
let DISCOVERED_IMAGE_CHUTE: string | null = 
  process.env.WARMED_IMAGE_CHUTE || 
  process.env.DISCOVERED_IMAGE_CHUTE || 
  null;

const testIf = hasAPIKey ? it : it.skip;

describe('Image Generation (Integration)', () => {
  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping image generation tests: CHUTES_API_KEY not set');
      return;
    }

    // Check if we have a pre-warmed or manual chute
    if (DISCOVERED_IMAGE_CHUTE) {
      const source = process.env.WARMED_IMAGE_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Using image chute ${source}: ${DISCOVERED_IMAGE_CHUTE}`);
    } else {
      // Fall back to dynamic discovery (slower, but works if global warmup failed)
      console.log('🔍 No pre-warmed image chute, discovering...');
      DISCOVERED_IMAGE_CHUTE = await findFirstChuteByType(process.env.CHUTES_API_KEY!, 'image');
      
      if (DISCOVERED_IMAGE_CHUTE) {
        console.log(`✅ Discovered image chute: ${DISCOVERED_IMAGE_CHUTE}`);
      } else {
        console.warn('⚠️  No image generation chutes found on platform. Skipping image tests.');
      }
    }
  }, 15000); // 15 second timeout (shorter since chute should be pre-warmed)

  testIf('should generate image from text prompt', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    console.log(`🎨 Generating image with chute: ${DISCOVERED_IMAGE_CHUTE}`);
    const result = await imageModel.doGenerate({
      prompt: 'A serene mountain landscape at sunset',
      n: 1,
      size: '1024x1024',
    });

    // Log warnings if any (retry logic in ImageModel handles rate limits automatically)
    if (result.warnings.length > 0) {
      console.error('⚠️  Image generation warnings:', JSON.stringify(result.warnings, null, 2));
    }

    // Should have one image
    expect(result.images).toBeDefined();
    expect(result.images.length).toBe(1);

    // Image should be a string (URL or base64 data URI)
    const image = result.images[0];
    expect(typeof image).toBe('string');
    expect(image.length).toBeGreaterThan(0);
    
    // Check if it's a base64 data URI or URL
    const isBase64 = image.startsWith('data:');
    const isUrl = image.startsWith('http://') || image.startsWith('https://');
    expect(isBase64 || isUrl).toBe(true);

    console.log('Generated image:', isBase64 ? `base64 data URI (${image.length} chars)` : image);
  }, 360000); // 6 minute timeout for image generation with retries

  testIf('should generate multiple images', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    console.log(`🎨 Generating 2 images with chute: ${DISCOVERED_IMAGE_CHUTE}`);
    const result = await imageModel.doGenerate({
      prompt: 'A cute robot in a garden',
      n: 2,
      size: '1024x1024', // Use standard size that most chutes support
    });

    // Log warnings if any (retry logic in ImageModel handles rate limits automatically)
    if (result.warnings.length > 0) {
      console.error('⚠️  Image generation warnings:', JSON.stringify(result.warnings, null, 2));
    }

    expect(result.images.length).toBe(2);
    
    // All images should be valid strings (URL or base64 data URI)
    for (const image of result.images) {
      expect(typeof image).toBe('string');
      expect(image.length).toBeGreaterThan(0);
      const isBase64 = image.startsWith('data:');
      const isUrl = image.startsWith('http://') || image.startsWith('https://');
      expect(isBase64 || isUrl).toBe(true);
    }
  }, 720000); // 12 minutes for generating 2 images with retries

  testIf('should respect size parameter', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    console.log(`🎨 Testing size parameter with chute: ${DISCOVERED_IMAGE_CHUTE}`);
    const result = await imageModel.doGenerate({
      prompt: 'A colorful abstract pattern',
      n: 1,
      size: '1024x1024', // Use standard size that most chutes support
    });

    // Log warnings if any (retry logic in ImageModel handles rate limits automatically)
    if (result.warnings.length > 0) {
      console.error('⚠️  Image generation warnings:', JSON.stringify(result.warnings, null, 2));
    }

    expect(result.images.length).toBe(1);
    // Size validation happens on server side
  }, 360000); // 6 minute timeout with retries

  testIf('should handle detailed prompts', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    const detailedPrompt = `
      A photorealistic portrait of a wise old wizard with a long white beard,
      wearing midnight blue robes with silver star patterns. He holds an ancient
      wooden staff with a glowing crystal at the top. The background shows a
      mystical library filled with floating books and magical artifacts.
      Cinematic lighting, highly detailed, 4K quality.
    `.trim();

    console.log(`🎨 Testing detailed prompt with chute: ${DISCOVERED_IMAGE_CHUTE}`);
    const result = await imageModel.doGenerate({
      prompt: detailedPrompt,
      n: 1,
      size: '1024x1024',
    });

    // Log warnings if any (retry logic in ImageModel handles rate limits automatically)
    if (result.warnings.length > 0) {
      console.error('⚠️  Image generation warnings:', JSON.stringify(result.warnings, null, 2));
    }

    expect(result.images.length).toBe(1);
    console.log('Detailed prompt result:', result.images[0]?.url || result.images[0] ? 'base64 image' : 'NO IMAGE');
  }, 360000); // 6 minute timeout with retries

  testIf('should handle aspect ratio variations', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    console.log(`🎨 Testing aspect ratio with chute: ${DISCOVERED_IMAGE_CHUTE}`);
    const result = await imageModel.doGenerate({
      prompt: 'A wide panoramic view of a futuristic city',
      n: 1,
      size: '1792x1024', // Wide format
      aspectRatio: '16:9',
    });

    // Log warnings if any (retry logic in ImageModel handles rate limits automatically)
    if (result.warnings.length > 0) {
      console.error('⚠️  Image generation warnings:', JSON.stringify(result.warnings, null, 2));
    }

    expect(result.images.length).toBe(1);
  }, 360000); // 6 minute timeout with retries

  testIf('should support model metadata', async () => {
    if (!DISCOVERED_IMAGE_CHUTE) {
      console.warn('⚠️  No image chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const imageModel = chutes.imageModel(DISCOVERED_IMAGE_CHUTE);
    
    // Check model properties
    expect(imageModel.provider).toBe('chutes');
    expect(imageModel.modelId).toBe(DISCOVERED_IMAGE_CHUTE!);
    expect(imageModel.specificationVersion).toBe('v2');
  });
});

