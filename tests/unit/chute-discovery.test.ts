/**
 * Unit tests for Chute Discovery Utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { discoverChutes, filterChutesByType } from '../../src/utils/chute-discovery';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Chute Discovery Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping chute discovery tests: CHUTES_API_KEY not set');
    }
  });

  describe('discoverChutes', () => {
    testIf('should fetch public chutes from the API', async () => {
      const apiKey = process.env.CHUTES_API_KEY!;
      const chutes = await discoverChutes(apiKey);

      expect(Array.isArray(chutes)).toBe(true);
      // Should have some public chutes available
      expect(chutes.length).toBeGreaterThan(0);
    }, 15000); // 15 second timeout for API call

    testIf('should return chutes with required fields', async () => {
      const apiKey = process.env.CHUTES_API_KEY!;
      const chutes = await discoverChutes(apiKey);

      if (chutes.length > 0) {
        const firstChute = chutes[0];
        expect(firstChute).toHaveProperty('slug');
        expect(firstChute).toHaveProperty('name');
        expect(firstChute).toHaveProperty('standard_template');
      }
    }, 15000);

    testIf('should return chutes with chute_id field', async () => {
      const apiKey = process.env.CHUTES_API_KEY!;
      const chutes = await discoverChutes(apiKey);

      if (chutes.length > 0) {
        const firstChute = chutes[0];
        expect(firstChute).toHaveProperty('chute_id');
        expect(typeof firstChute.chute_id).toBe('string');
        // UUID format check (basic)
        expect(firstChute.chute_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    }, 15000);
  });

  describe('filterChutesByType', () => {
    it('should filter embedding chutes by TEI template', () => {
      const mockChutes = [
        { slug: 'embed-1', name: 'Embeddings', standard_template: 'TEI' },
        { slug: 'llm-1', name: 'LLM', standard_template: 'vllm' },
        { slug: 'embed-2', name: 'Another Embed', standard_template: 'TEI' },
      ];

      const embeddingChutes = filterChutesByType(mockChutes, 'embedding');
      
      expect(embeddingChutes.length).toBe(2);
      expect(embeddingChutes[0].slug).toBe('embed-1');
      expect(embeddingChutes[1].slug).toBe('embed-2');
    });

    it('should exclude video models from image chutes', () => {
      const mockChutes = [
        { slug: 'image-1', name: 'Stable Diffusion XL', standard_template: 'diffusion' },
        { slug: 'video-1', name: 'Wan-2.2-I2V-14B-Fast', standard_template: 'video' }, // Image-to-Video - has no 'image' keyword
        { slug: 'video-2', name: 'Video Generation Model', standard_template: 'custom', description: 'Generate videos' },
        { slug: 'video-3', name: 'Image-to-Video Pipeline', standard_template: 'custom' }, // Contains 'image' in name but is video
        { slug: 'image-2', name: 'FLUX.1-dev', standard_template: 'diffusion' },
      ];

      const imageChutes = filterChutesByType(mockChutes, 'image');
      
      // Should only get actual image generation models, NOT video models
      expect(imageChutes.length).toBe(2);
      expect(imageChutes[0].slug).toBe('image-1');
      expect(imageChutes[1].slug).toBe('image-2');
      
      // Verify video models are excluded (especially video-3 which has 'image' in the name)
      const videoChuteSlugs = imageChutes.map(c => c.slug);
      expect(videoChuteSlugs).not.toContain('video-1');
      expect(videoChuteSlugs).not.toContain('video-2');
      expect(videoChuteSlugs).not.toContain('video-3'); // This one contains 'image' but should be excluded
    });

    it('should filter image chutes by diffusion template', () => {
      const mockChutes = [
        { slug: 'image-1', name: 'Image Gen', standard_template: 'diffusion' },
        { slug: 'llm-1', name: 'LLM', standard_template: 'vllm' },
        { slug: 'image-2', name: 'FLUX', standard_template: 'diffusion' },
      ];

      const imageChutes = filterChutesByType(mockChutes, 'image');
      
      expect(imageChutes.length).toBe(2);
      expect(imageChutes[0].slug).toBe('image-1');
      expect(imageChutes[1].slug).toBe('image-2');
    });

    it('should also match chutes by name keywords', () => {
      const mockChutes = [
        { slug: 'embed-1', name: 'text-embeddings-3', standard_template: 'custom' },
        { slug: 'image-1', name: 'stable-diffusion-xl', standard_template: 'custom' },
        { slug: 'llm-1', name: 'gpt-4', standard_template: 'vllm' },
      ];

      const embeddingChutes = filterChutesByType(mockChutes, 'embedding');
      const imageChutes = filterChutesByType(mockChutes, 'image');
      
      expect(embeddingChutes.length).toBeGreaterThanOrEqual(1);
      expect(imageChutes.length).toBeGreaterThanOrEqual(1);
    });

    it('should not match video models as stable image models', () => {
      const mockChutes = [
        { slug: 'stable-video', name: 'Stable Video Diffusion', standard_template: 'custom' },
        { slug: 'stable-image', name: 'Stable Diffusion', standard_template: 'diffusion' },
      ];

      const imageChutes = filterChutesByType(mockChutes, 'image');
      
      // Should only match actual stable diffusion image models
      expect(imageChutes.length).toBe(1);
      expect(imageChutes[0].slug).toBe('stable-image');
    });

    it('should filter video chutes by video template', () => {
      const mockChutes = [
        { slug: 'video-1', name: 'Text-to-Video', standard_template: 'video' },
        { slug: 'image-1', name: 'Image Gen', standard_template: 'diffusion' },
        { slug: 'video-2', name: 'I2V Pipeline', standard_template: 'video' },
      ];

      const videoChutes = filterChutesByType(mockChutes, 'video');
      
      expect(videoChutes.length).toBe(2);
      expect(videoChutes[0].slug).toBe('video-1');
      expect(videoChutes[1].slug).toBe('video-2');
    });

    it('should filter video chutes by name keywords', () => {
      const mockChutes = [
        { slug: 'video-1', name: 'text2video-model', standard_template: 'custom' },
        { slug: 'video-2', name: 'Image-to-Video Pipeline', standard_template: 'custom' },
        { slug: 'video-3', name: 'i2v-fast', standard_template: 'custom' },
        { slug: 'image-1', name: 'FLUX Image Gen', standard_template: 'diffusion' },
        { slug: 'audio-1', name: 'TTS Model', standard_template: 'custom' },
      ];

      const videoChutes = filterChutesByType(mockChutes, 'video');
      
      expect(videoChutes.length).toBe(3);
      expect(videoChutes.map(c => c.slug)).toContain('video-1');
      expect(videoChutes.map(c => c.slug)).toContain('video-2');
      expect(videoChutes.map(c => c.slug)).toContain('video-3');
    });

    it('should distinguish text-to-video from image-to-video', () => {
      const mockChutes = [
        { slug: 't2v-1', name: 'Text2Video Model', standard_template: 'video', description: 'Generate video from text' },
        { slug: 'i2v-1', name: 'Image2Video Model', standard_template: 'video', description: 'Animate images to video' },
      ];

      const videoChutes = filterChutesByType(mockChutes, 'video');
      
      // Both should be included
      expect(videoChutes.length).toBe(2);
    });

    it('should not confuse video chutes with other types', () => {
      const mockChutes = [
        { slug: 'video-1', name: 'Video Generator', standard_template: 'video' },
        { slug: 'image-1', name: 'Image Generator', standard_template: 'diffusion' },
        { slug: 'audio-1', name: 'Audio Generator', standard_template: 'tts' },
        { slug: 'llm-1', name: 'Text Generator', standard_template: 'vllm' },
      ];

      const videoChutes = filterChutesByType(mockChutes, 'video');
      
      expect(videoChutes.length).toBe(1);
      expect(videoChutes[0].slug).toBe('video-1');
    });

    it('should exclude vision-language models (VL) from video chutes', () => {
      const mockChutes = [
        { slug: 'video-1', name: 'Video Gen Model', standard_template: 'video', description: 'Generate videos from text' },
        { slug: 'vl-1', name: 'Qwen2.5-VL-72B-Instruct', standard_template: 'vllm', description: 'Vision-language model for understanding images' },
        { slug: 'vl-2', name: 'LLaVA-v1.6-vicuna-7b', standard_template: 'vllm', description: 'Visual language model' },
        { slug: 'video-2', name: 'text2video-model', standard_template: 'video-generation', description: 'Text to video generation' },
      ];

      const videoChutes = filterChutesByType(mockChutes, 'video');
      
      // Should only find actual video generation models, not VL models
      expect(videoChutes.length).toBe(2);
      expect(videoChutes.map(c => c.slug)).toContain('video-1');
      expect(videoChutes.map(c => c.slug)).toContain('video-2');
      expect(videoChutes.map(c => c.slug)).not.toContain('vl-1');
      expect(videoChutes.map(c => c.slug)).not.toContain('vl-2');
    });
  });
});

