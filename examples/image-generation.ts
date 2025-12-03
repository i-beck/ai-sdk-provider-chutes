/**
 * Image Generation Example
 * 
 * This example demonstrates how to generate images using the Chutes.ai provider
 * with the Vercel AI SDK.
 * 
 * Run this example:
 * ```bash
 * npm run dev examples/image-generation.ts
 * ```
 */

import { createChutes } from '../src';
import 'dotenv/config';

async function main() {
  // Initialize the Chutes provider
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  console.log('🎨 Chutes.ai Image Generation Example\n');

  // Example 1: Basic image generation
  console.log('Example 1: Basic image generation');
  console.log('Generating image from prompt...');
  
  const imageModel = chutes.imageModel('https://chutes-flux-1-dev.chutes.ai');
  
  const result = await imageModel.doGenerate({
    prompt: 'A serene mountain landscape at sunset with a lake reflection',
    n: 1,
    size: '1024x1024',
  });

  console.log(`✅ Generated ${result.images.length} image(s)`);
  console.log(`   Image format: base64 data URI (${result.images[0].length} chars)`);
  
  if (result.warnings.length > 0) {
    console.log(`⚠️  Warnings:`, result.warnings);
  }

  // Example 2: Multiple images
  console.log('\nExample 2: Generating multiple images');
  console.log('Generating 2 images (sequential API calls)...');
  
  const multiResult = await imageModel.doGenerate({
    prompt: 'A cute robot assistant helping with coding',
    n: 2,
    size: '512x512',
  });

  console.log(`✅ Generated ${multiResult.images.length} image(s)`);
  multiResult.images.forEach((img, i) => {
    console.log(`   Image ${i + 1}: ${img.substring(0, 50)}...`);
  });

  // Example 3: Different sizes/aspect ratios
  console.log('\nExample 3: Different aspect ratios');
  console.log('Generating wide-format image...');
  
  const wideResult = await imageModel.doGenerate({
    prompt: 'A futuristic cityscape panorama',
    n: 1,
    size: '1792x1024', // 16:9-ish aspect ratio
  });

  console.log(`✅ Generated wide-format image`);

  // Example 4: With optional parameters
  console.log('\nExample 4: With seed for reproducibility');
  console.log('Generating image with seed=42...');
  
  const seedResult = await imageModel.doGenerate({
    prompt: 'A magical forest with glowing mushrooms',
    n: 1,
    size: '1024x1024',
    seed: 42,
  });

  console.log(`✅ Generated deterministic image (seed=42)`);

  // Note: To save images to disk, decode the base64 data URI:
  console.log('\n💡 Tip: To save images to disk:');
  console.log('```typescript');
  console.log('import { writeFileSync } from "fs";');
  console.log('const base64Data = result.images[0].split(",")[1];');
  console.log('const buffer = Buffer.from(base64Data, "base64");');
  console.log('writeFileSync("generated-image.png", buffer);');
  console.log('```');
}

main().catch(console.error);

