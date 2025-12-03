/**
 * Unit Tests for Test Warmup Module
 * 
 * Tests the global warmup setup that discovers and pre-warms chutes for integration tests.
 * This ensures tests run against hot chutes, reducing flakiness and timeouts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  discoverTestChutes,
  warmupTestChutes,
  getTestChutes,
  setTestChutes,
  clearTestChutes,
  getTestChuteUrl,
  getTestChuteId,
  type TestChuteConfig,
} from '../setup/test-chutes';

describe('Test Chutes Module', () => {
  beforeEach(() => {
    // Clear any cached chutes before each test
    clearTestChutes();
  });

  describe('discoverTestChutes', () => {
    it('should throw error if no API key provided', async () => {
      await expect(discoverTestChutes('')).rejects.toThrow('API key is required');
    });

    it('should throw error if API key is whitespace', async () => {
      await expect(discoverTestChutes('   ')).rejects.toThrow('API key is required');
    });
  });

  describe('warmupTestChutes', () => {
    it('should warm up all discovered chutes', async () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
        image: { chuteId: 'img-456', url: 'https://test-img.chutes.ai', name: 'Test Image' },
      };

      // Mock warmup function
      const mockWarmup = vi.fn().mockResolvedValue({ success: true, isHot: true, instanceCount: 2 });
      
      const results = await warmupTestChutes(testConfig, 'test-api-key', mockWarmup);
      
      expect(results.llm?.success).toBe(true);
      expect(results.image?.success).toBe(true);
      expect(mockWarmup).toHaveBeenCalledTimes(2);
      expect(mockWarmup).toHaveBeenCalledWith('llm-123', 'test-api-key');
      expect(mockWarmup).toHaveBeenCalledWith('img-456', 'test-api-key');
    });

    it('should continue warming other chutes if one fails', async () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
        image: { chuteId: 'img-456', url: 'https://test-img.chutes.ai', name: 'Test Image' },
      };

      // Mock warmup - first fails, second succeeds
      const mockWarmup = vi.fn()
        .mockRejectedValueOnce(new Error('Warmup failed for LLM'))
        .mockResolvedValueOnce({ success: true, isHot: true });
      
      const results = await warmupTestChutes(testConfig, 'test-api-key', mockWarmup);
      
      expect(results.llm?.success).toBe(false);
      expect(results.llm?.error).toBe('Warmup failed for LLM');
      expect(results.image?.success).toBe(true);
    });

    it('should skip warmup for chutes that are already hot when skipIfHot is true', async () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM', isHot: true },
        image: { chuteId: 'img-456', url: 'https://test-img.chutes.ai', name: 'Test Image', isHot: false },
      };

      const mockWarmup = vi.fn().mockResolvedValue({ success: true, isHot: true });
      
      const results = await warmupTestChutes(testConfig, 'test-api-key', mockWarmup, { skipIfHot: true });
      
      // LLM should be skipped, image should be warmed
      expect(results.llm?.skipped).toBe(true);
      expect(results.image?.success).toBe(true);
      expect(mockWarmup).toHaveBeenCalledTimes(1);
      expect(mockWarmup).toHaveBeenCalledWith('img-456', 'test-api-key');
    });

    it('should handle empty config', async () => {
      const testConfig: TestChuteConfig = {};
      const mockWarmup = vi.fn();
      
      const results = await warmupTestChutes(testConfig, 'test-api-key', mockWarmup);
      
      expect(Object.keys(results)).toHaveLength(0);
      expect(mockWarmup).not.toHaveBeenCalled();
    });

    it('should update chute info with warmup status', async () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
      };

      const mockWarmup = vi.fn().mockResolvedValue({ 
        success: true, 
        isHot: true, 
        instanceCount: 3 
      });
      
      await warmupTestChutes(testConfig, 'test-api-key', mockWarmup);
      
      // Config should be updated with warmup status
      expect(testConfig.llm?.isHot).toBe(true);
      expect(testConfig.llm?.instanceCount).toBe(3);
    });
  });

  describe('getTestChutes / setTestChutes', () => {
    it('should store and retrieve test chute configuration', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
      };

      setTestChutes(testConfig);
      const retrieved = getTestChutes();

      expect(retrieved).toEqual(testConfig);
    });

    it('should return undefined if no chutes configured', () => {
      clearTestChutes();
      const config = getTestChutes();
      
      expect(config).toBeUndefined();
    });

    it('should allow getting specific chute type', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
        image: { chuteId: 'img-456', url: 'https://test-img.chutes.ai', name: 'Test Image' },
      };

      setTestChutes(testConfig);
      
      const llmChute = getTestChutes()?.llm;
      const imageChute = getTestChutes()?.image;
      const videoChute = getTestChutes()?.video;

      expect(llmChute?.url).toBe('https://test-llm.chutes.ai');
      expect(imageChute?.url).toBe('https://test-img.chutes.ai');
      expect(videoChute).toBeUndefined();
    });

    it('should overwrite previous configuration', () => {
      const config1: TestChuteConfig = {
        llm: { chuteId: 'llm-1', url: 'https://llm-1.chutes.ai', name: 'LLM 1' },
      };
      const config2: TestChuteConfig = {
        llm: { chuteId: 'llm-2', url: 'https://llm-2.chutes.ai', name: 'LLM 2' },
      };

      setTestChutes(config1);
      expect(getTestChutes()?.llm?.chuteId).toBe('llm-1');

      setTestChutes(config2);
      expect(getTestChutes()?.llm?.chuteId).toBe('llm-2');
    });
  });

  describe('clearTestChutes', () => {
    it('should clear all cached test chutes', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://test-llm.chutes.ai', name: 'Test LLM' },
      };

      setTestChutes(testConfig);
      expect(getTestChutes()).toBeDefined();

      clearTestChutes();
      expect(getTestChutes()).toBeUndefined();
    });
  });

  describe('getTestChuteUrl', () => {
    it('should return cached URL if available', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://cached-llm.chutes.ai', name: 'Test LLM' },
      };

      setTestChutes(testConfig);
      
      const url = getTestChuteUrl('llm');
      expect(url).toBe('https://cached-llm.chutes.ai');
    });

    it('should return undefined if no cached URL and no env fallback', () => {
      clearTestChutes();
      const url = getTestChuteUrl('llm');
      expect(url).toBeUndefined();
    });

    it('should return env fallback if no cached URL', () => {
      clearTestChutes();
      process.env.TEST_FALLBACK_URL = 'https://env-fallback.chutes.ai';
      
      const url = getTestChuteUrl('llm', 'TEST_FALLBACK_URL');
      expect(url).toBe('https://env-fallback.chutes.ai');
      
      // Cleanup
      delete process.env.TEST_FALLBACK_URL;
    });

    it('should prefer cached URL over env fallback', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://cached-llm.chutes.ai', name: 'Test LLM' },
      };
      setTestChutes(testConfig);
      process.env.TEST_FALLBACK_URL = 'https://env-fallback.chutes.ai';
      
      const url = getTestChuteUrl('llm', 'TEST_FALLBACK_URL');
      expect(url).toBe('https://cached-llm.chutes.ai');
      
      // Cleanup
      delete process.env.TEST_FALLBACK_URL;
    });
  });

  describe('getTestChuteId', () => {
    it('should return cached chute ID', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-uuid-123', url: 'https://llm.chutes.ai', name: 'Test LLM' },
      };

      setTestChutes(testConfig);
      
      const chuteId = getTestChuteId('llm');
      expect(chuteId).toBe('llm-uuid-123');
    });

    it('should return undefined if chute type not configured', () => {
      const testConfig: TestChuteConfig = {
        llm: { chuteId: 'llm-123', url: 'https://llm.chutes.ai', name: 'Test LLM' },
      };

      setTestChutes(testConfig);
      
      const chuteId = getTestChuteId('video');
      expect(chuteId).toBeUndefined();
    });

    it('should return undefined if no chutes configured', () => {
      clearTestChutes();
      const chuteId = getTestChuteId('llm');
      expect(chuteId).toBeUndefined();
    });
  });
});

describe('TestChuteConfig Interface', () => {
  it('should have correct structure for each chute type', () => {
    const config: TestChuteConfig = {
      llm: {
        chuteId: 'llm-123',
        url: 'https://llm.chutes.ai',
        name: 'LLM Model',
        isHot: true,
        instanceCount: 2,
      },
      image: {
        chuteId: 'img-456',
        url: 'https://img.chutes.ai',
        name: 'Image Model',
      },
      video: {
        chuteId: 'vid-789',
        url: 'https://vid.chutes.ai',
        name: 'Video Model',
      },
      embedding: {
        chuteId: 'emb-012',
        url: 'https://emb.chutes.ai',
        name: 'Embedding Model',
      },
      tts: {
        chuteId: 'tts-345',
        url: 'https://tts.chutes.ai',
        name: 'TTS Model',
      },
      stt: {
        chuteId: 'stt-678',
        url: 'https://stt.chutes.ai',
        name: 'STT Model',
      },
    };

    // Type checking - all fields should be accessible
    expect(config.llm?.chuteId).toBe('llm-123');
    expect(config.llm?.isHot).toBe(true);
    expect(config.llm?.instanceCount).toBe(2);
    expect(config.image?.chuteId).toBe('img-456');
    expect(config.video?.chuteId).toBe('vid-789');
    expect(config.embedding?.chuteId).toBe('emb-012');
    expect(config.tts?.chuteId).toBe('tts-345');
    expect(config.stt?.chuteId).toBe('stt-678');
  });
});
