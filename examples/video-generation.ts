/**
 * Video Generation Example
 * 
 * Demonstrates:
 * - Text-to-Video generation
 * - Image-to-Video animation
 * - Different output formats
 * - Custom video settings
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get video model (replace with actual video chute ID)
  const videoModel = chutes.videoModel('your-video-chute-id');

  console.log('🎬 Video Generation Examples\n');

  // Example 1: Text-to-Video generation
  console.log('📝 Example 1: Text-to-Video Generation');
  try {
    const result = await videoModel.generateVideo({
      prompt: 'A serene sunset over mountains with birds flying',
      resolution: '1024x576',
      fps: 24,
      steps: 30,
      outputFormat: 'base64', // or 'buffer'
    });

    console.log('✅ Video generated successfully!');
    console.log(`   Format: ${result.metadata?.format}`);
    console.log(`   Resolution: ${result.metadata?.resolution}`);
    console.log(`   FPS: ${result.metadata?.fps}`);
    
    // Save to file (if buffer format)
    if (Buffer.isBuffer(result.video)) {
      const outputPath = path.join(__dirname, 'output-text2video.mp4');
      fs.writeFileSync(outputPath, result.video);
      console.log(`   Saved to: ${outputPath}`);
    } else {
      // For base64 format, you'd extract and save the base64 data
      console.log(`   Data URI length: ${result.video.length} chars`);
    }
  } catch (error) {
    console.error('❌ Error generating video:', error);
  }

  console.log('\n---\n');

  // Example 2: Image-to-Video animation
  console.log('🖼️  Example 2: Image-to-Video Animation');
  try {
    const result = await videoModel.animateImage({
      prompt: 'Make the image come alive with gentle movement',
      image: 'https://example.com/image.jpg', // Can be URL, base64, or Buffer
      fps: 24,
      steps: 25,
      outputFormat: 'buffer',
    });

    console.log('✅ Video animated successfully!');
    
    if (Buffer.isBuffer(result.video)) {
      const outputPath = path.join(__dirname, 'output-image2video.mp4');
      fs.writeFileSync(outputPath, result.video);
      console.log(`   Saved to: ${outputPath}`);
    }
  } catch (error) {
    console.error('❌ Error animating image:', error);
  }

  console.log('\n---\n');

  // Example 3: Deterministic generation with seed
  console.log('🎲 Example 3: Deterministic Generation (with seed)');
  try {
    const seed = 12345;
    
    const result1 = await videoModel.generateVideo({
      prompt: 'A cat playing with yarn',
      seed,
      steps: 20,
    });

    const result2 = await videoModel.generateVideo({
      prompt: 'A cat playing with yarn',
      seed, // Same seed = similar results
      steps: 20,
    });

    console.log('✅ Generated two videos with same seed');
    console.log('   Both should produce similar results');
  } catch (error) {
    console.error('❌ Error with deterministic generation:', error);
  }
}

// Run examples
main().catch(console.error);

