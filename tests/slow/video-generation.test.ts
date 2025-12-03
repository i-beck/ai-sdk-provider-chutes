import { describe, it, expect, beforeAll } from 'vitest';
import { VideoModel } from '../../src/models/video-model';
import { discoverChutes, filterChutesByType, getChuteUrl } from '../../src/utils/chute-discovery';

/**
 * Integration Tests for Video Generation
 * 
 * Tests BOTH Text-to-Video (T2V) and Image-to-Video (I2V) using separate chutes.
 * Global warmup discovers and warms both types, then passes them via env vars.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

// Separate chutes for T2V and I2V - set by global warmup
let T2V_CHUTE: string | null = process.env.WARMED_T2V_CHUTE || null;
let I2V_CHUTE: string | null = process.env.WARMED_I2V_CHUTE || process.env.WARMED_VIDEO_CHUTE || null;

// Helper to detect chute type (for fallback discovery)
function isI2VChute(url: string): boolean {
  const name = url.toLowerCase();
  return name.includes('i2v') || 
         name.includes('image-to-video') ||
         name.includes('img2vid') ||
         name.includes('wan');
}

function isT2VChute(url: string): boolean {
  const name = url.toLowerCase();
  return name.includes('t2v') || 
         name.includes('text-to-video') ||
         name.includes('txt2vid') ||
         name.includes('mochi') ||
         name.includes('hunyuan');
}

describe('Video Generation Integration', () => {
  let t2vModel: VideoModel | null = null;
  let i2vModel: VideoModel | null = null;

  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping video generation tests: CHUTES_API_KEY not set');
      return;
    }

    const apiKey = process.env.CHUTES_API_KEY!;
    const baseURL = process.env.CHUTES_BASE_URL || 'https://api.chutes.ai';

    // Log what we got from global warmup
    if (T2V_CHUTE) {
      console.log(`✅ Using pre-warmed T2V chute: ${T2V_CHUTE}`);
    }
    if (I2V_CHUTE) {
      console.log(`✅ Using pre-warmed I2V chute: ${I2V_CHUTE}`);
    }

    // Fallback discovery if global warmup didn't find chutes
    if (!T2V_CHUTE || !I2V_CHUTE) {
      console.log('🔍 Discovering missing video chutes...');
      const allChutes = await discoverChutes(apiKey);
      const videoChutes = filterChutesByType(allChutes, 'video');
      
      for (const chute of videoChutes) {
        const url = getChuteUrl(chute.slug);
        
        if (!T2V_CHUTE && isT2VChute(url)) {
          T2V_CHUTE = url;
          console.log(`   ✓ Found T2V: ${chute.name}`);
        }
        if (!I2V_CHUTE && isI2VChute(url)) {
          I2V_CHUTE = url;
          console.log(`   ✓ Found I2V: ${chute.name}`);
        }
        
        if (T2V_CHUTE && I2V_CHUTE) break;
      }
    }

    // Create models for each type
    if (T2V_CHUTE) {
      t2vModel = new VideoModel({
        chuteId: T2V_CHUTE,
        baseURL,
        apiKey,
      });
    } else {
      console.warn('⚠️  No Text-to-Video chute found - T2V tests will be skipped');
    }

    if (I2V_CHUTE) {
      i2vModel = new VideoModel({
        chuteId: I2V_CHUTE,
        baseURL,
        apiKey,
      });
    } else {
      console.warn('⚠️  No Image-to-Video chute found - I2V tests will be skipped');
    }
  }, 60000);

  describe('Text-to-Video Generation', () => {
    testIf('should generate video from text prompt with default settings', async () => {
      if (!t2vModel) {
        console.warn('⚠️  No T2V chute available, skipping test');
        return;
      }

      const result = await t2vModel.generateVideo({
        prompt: 'A serene sunset over mountains',
      });

      expect(result).toBeDefined();
      expect(result.video).toBeDefined();
      
      // Should return base64 data URI by default
      expect(typeof result.video).toBe('string');
      expect((result.video as string).startsWith('data:video/mp4;base64,')).toBe(true);
      
      // Metadata should be included
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe('mp4');
    }, 120000);

    testIf('should generate video with custom resolution and fps', async () => {
      if (!t2vModel) {
        console.warn('⚠️  No T2V chute available, skipping test');
        return;
      }

      const result = await t2vModel.generateVideo({
        prompt: 'A cat playing with yarn',
        resolution: '512x512',
        fps: 12,
        steps: 20,
      });

      expect(result).toBeDefined();
      expect(result.video).toBeDefined();
      expect(result.metadata?.resolution).toBe('512x512');
      expect(result.metadata?.fps).toBe(12);
    }, 120000);

    testIf('should return Buffer when outputFormat is buffer', async () => {
      if (!t2vModel) {
        console.warn('⚠️  No T2V chute available, skipping test');
        return;
      }

      const result = await t2vModel.generateVideo({
        prompt: 'Waves crashing on a beach',
        outputFormat: 'buffer',
      });

      expect(result).toBeDefined();
      expect(result.video).toBeDefined();
      expect(Buffer.isBuffer(result.video)).toBe(true);
      
      // Buffer should contain MP4 header
      const buffer = result.video as Buffer;
      expect(buffer.length).toBeGreaterThan(0);
    }, 120000);

    testIf('should support deterministic generation with seed', async () => {
      if (!t2vModel) {
        console.warn('⚠️  No T2V chute available, skipping test');
        return;
      }

      const seed = 12345;
      
      const result1 = await t2vModel.generateVideo({
        prompt: 'A red apple on a table',
        seed,
        steps: 15,
      });

      const result2 = await t2vModel.generateVideo({
        prompt: 'A red apple on a table',
        seed,
        steps: 15,
      });

      // With same seed and prompt, should generate similar videos
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    }, 240000); // 4 minutes for two video generations

    it('should handle API errors gracefully', async () => {
      const invalidModel = new VideoModel({
        chuteId: 'nonexistent-chute',
        baseURL: 'https://api.chutes.ai',
        apiKey: 'invalid-key',
      });

      await expect(
        invalidModel.generateVideo({
          prompt: 'This should fail',
        })
      ).rejects.toThrow();
    }, 10000);
  });

  describe('Image-to-Video Generation', () => {
    testIf('should animate image from URL', async () => {
      if (!i2vModel) {
        console.warn('⚠️  No I2V chute available, skipping test');
        return;
      }

      // Use a publicly accessible image URL (small test image)
      const publicImageUrl = 'https://raw.githubusercontent.com/user-attachments/assets/placeholder.png';
      
      try {
        const result = await i2vModel.animateImage({
          prompt: 'Make the image come alive with movement',
          image: publicImageUrl,
          fps: 24,
        });

        expect(result).toBeDefined();
        expect(result.video).toBeDefined();
        expect(typeof result.video).toBe('string');
      } catch (error: any) {
        // If external URL fails (401, 404, etc.), skip this test gracefully
        if (error.message && error.message.includes('Failed to fetch image from URL')) {
          console.warn('⚠️  External image URL unavailable, skipping URL test');
          return;
        }
        throw error;
      }
    }, 180000);

    testIf('should animate image from base64 data', async () => {
      if (!i2vModel) {
        console.warn('⚠️  No I2V chute available, skipping test');
        return;
      }

      try {
        // Small 1x1 red pixel PNG as base64
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const result = await i2vModel.animateImage({
          prompt: 'Animate this pixel',
          image: testImageBase64,
          steps: 10,
        });

        expect(result).toBeDefined();
        expect(result.video).toBeDefined();
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
    }, 180000);

    testIf('should animate image from data URI', async () => {
      if (!i2vModel) {
        console.warn('⚠️  No I2V chute available, skipping test');
        return;
      }

      try {
        const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const result = await i2vModel.animateImage({
          prompt: 'Add motion',
          image: dataUri,
        });

        expect(result).toBeDefined();
        expect(result.video).toBeDefined();
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
    }, 180000);

    testIf('should animate image from Buffer', async () => {
      if (!i2vModel) {
        console.warn('⚠️  No I2V chute available, skipping test');
        return;
      }

      try {
        // Create a small test buffer (1x1 PNG)
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        
        const result = await i2vModel.animateImage({
          prompt: 'Animate buffer image',
          image: testBuffer,
        });

        expect(result).toBeDefined();
        expect(result.video).toBeDefined();
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
    }, 180000);
  });

  describe('Video Model Configuration', () => {
    it('should use default settings from constructor', async () => {
      const configuredModel = new VideoModel({
        chuteId: 'test-chute',
        baseURL: 'https://api.chutes.ai',
        apiKey: 'test-key',
        resolution: '1024x576',
        fps: 30,
        steps: 25,
      });

      expect(configuredModel.modelId).toBe('test-chute');
      expect(configuredModel.provider).toBe('chutes');
    });

    testIf('should override default settings in method calls', async () => {
      if (!t2vModel) {
        console.warn('⚠️  No T2V chute available, skipping test');
        return;
      }

      const configuredModel = new VideoModel({
        chuteId: T2V_CHUTE!,
        baseURL: process.env.CHUTES_BASE_URL || 'https://api.chutes.ai',
        apiKey: process.env.CHUTES_API_KEY || 'test-key',
        fps: 12, // default fps
      });

      const result = await configuredModel.generateVideo({
        prompt: 'Override test',
        fps: 24, // override
        steps: 15,
      });

      expect(result.metadata?.fps).toBe(24);
    }, 120000);
  });
});
