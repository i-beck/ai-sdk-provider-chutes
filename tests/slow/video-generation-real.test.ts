import { describe, it, expect, beforeAll } from 'vitest';
import { VideoModel } from '../../src/models/video-model';
import { discoverChutes, filterChutesByType, getChuteUrl } from '../../src/utils/chute-discovery';
import * as fs from 'fs';
import * as path from 'path';

/**
 * REAL Video Generation Test
 * Uses actual image file (bing-chuting.png) to test Image-to-Video generation.
 * 
 * This test specifically needs an I2V (Image-to-Video) chute.
 * Global warmup discovers and warms the I2V chute, then passes it via env var.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

// Helper to detect I2V chute (for fallback)
function isI2VChute(url: string): boolean {
  const name = url.toLowerCase();
  return name.includes('i2v') || 
         name.includes('image-to-video') ||
         name.includes('img2vid') ||
         name.includes('wan');
}

// Get pre-warmed I2V chute from global setup
let I2V_CHUTE: string | null = process.env.WARMED_I2V_CHUTE || process.env.WARMED_VIDEO_CHUTE || null;

describe('Real Video Generation Test', () => {
  let videoModel: VideoModel;

  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping: CHUTES_API_KEY not set');
      return;
    }

    const apiKey = process.env.CHUTES_API_KEY!;
    const baseURL = process.env.CHUTES_BASE_URL || 'https://api.chutes.ai';

    // Log what we got from global warmup
    if (I2V_CHUTE) {
      console.log(`✅ Using pre-warmed I2V chute: ${I2V_CHUTE}`);
    } else {
      // Fallback discovery if global warmup didn't find I2V chute
      console.log('🔍 Discovering I2V chute...');
      const allChutes = await discoverChutes(apiKey);
      const videoChutes = filterChutesByType(allChutes, 'video');
      
      for (const chute of videoChutes) {
        const url = getChuteUrl(chute.slug);
        if (isI2VChute(url)) {
          I2V_CHUTE = url;
          console.log(`   ✓ Found I2V: ${chute.name}`);
          break;
        }
      }
    }
    
    if (I2V_CHUTE) {
      videoModel = new VideoModel({
        chuteId: I2V_CHUTE,
        baseURL,
        apiKey,
      });
    } else {
      console.warn('⚠️  No Image-to-Video chute found - I2V tests will be skipped');
    }
  }, 60000);

  testIf('should animate bing-chuting.png image into video', async () => {
    if (!I2V_CHUTE) {
      console.warn('⚠️  No I2V chute available, skipping');
      return;
    }

    // Read the actual image file
    const imagePath = path.join(__dirname, 'bing-chuting.png');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found at: ${imagePath}`);
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      console.log(`📸 Loaded image: ${imageBuffer.length} bytes`);

      // Animate it with a creative prompt
      console.log('🎬 Generating video from image...');
      const result = await videoModel.animateImage({
        prompt: 'The man talks animatedly while his ice cream cone melts, realistic high action movement with drips falling',
        image: imageBuffer,
        outputFormat: 'buffer',
      });

      // Verify we got a video
      expect(result).toBeDefined();
      expect(result.video).toBeDefined();
      expect(Buffer.isBuffer(result.video)).toBe(true);

      const videoBuffer = result.video as Buffer;
      console.log(`🎥 Generated video: ${videoBuffer.length} bytes`);
      expect(videoBuffer.length).toBeGreaterThan(1000);

      // Optionally save the output for manual review
      const outputPath = path.join(__dirname, 'output-bing-chuting-animated.mp4');
      fs.writeFileSync(outputPath, videoBuffer);
      console.log(`💾 Saved output to: ${outputPath}`);
    } catch (error: any) {
      if (error.statusCode === 429 || error.message?.includes('Rate limit')) {
        console.warn('⚠️  Skipping test: API rate limited');
        return;
      }
      if (error.message?.includes('ENOTFOUND') || error.message?.includes('Network error')) {
        console.warn('⚠️  Skipping test: Network error');
        return;
      }
      throw error;
    }
  }, 300000); // 5 minute timeout for real video generation
});
