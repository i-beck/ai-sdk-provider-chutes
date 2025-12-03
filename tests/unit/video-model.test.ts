import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoModel } from '../../src/models/video-model';

describe('VideoModel', () => {
  describe('Type Definition', () => {
    it('should export VideoModel class', () => {
      expect(VideoModel).toBeDefined();
      expect(typeof VideoModel).toBe('function');
    });

    it('should instantiate with required configuration', () => {
      const model = new VideoModel({
        chuteId: 'video-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model).toBeInstanceOf(VideoModel);
      expect(model.modelId).toBe('video-test-chute');
      expect(model.provider).toBe('chutes');
    });

    it('should have generateVideo method', () => {
      const model = new VideoModel({
        chuteId: 'video-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.generateVideo).toBeDefined();
      expect(typeof model.generateVideo).toBe('function');
    });

    it('should have animateImage method', () => {
      const model = new VideoModel({
        chuteId: 'video-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.animateImage).toBeDefined();
      expect(typeof model.animateImage).toBe('function');
    });

    it('should have doGenerate method', () => {
      const model = new VideoModel({
        chuteId: 'video-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.doGenerate).toBeDefined();
      expect(typeof model.doGenerate).toBe('function');
    });
  });

  describe('Type Interfaces', () => {
    it('should accept VideoSettings in configuration', () => {
      const model = new VideoModel({
        chuteId: 'video-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        resolution: '1024x576',
        fps: 24,
        steps: 30,
      });
      
      expect(model).toBeInstanceOf(VideoModel);
    });

    it('should accept outputFormat option', () => {
      const modelBase64 = new VideoModel({
        chuteId: 'video-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'base64',
      });
      expect(modelBase64).toBeInstanceOf(VideoModel);

      const modelBuffer = new VideoModel({
        chuteId: 'video-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'buffer',
      });
      expect(modelBuffer).toBeInstanceOf(VideoModel);
    });
  });

  describe('Output Formats', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    // Create a sample video binary data (simplified MP4 header + content)
    const sampleVideoData = new Uint8Array([
      // Fake MP4 header bytes
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x00, 0x00, // isom
      0x6D, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08, // mp41
      // Some additional bytes
      0x66, 0x72, 0x65, 0x65, 0x54, 0x65, 0x73, 0x74,
    ]);

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return base64 data URI when outputFormat is "base64"', async () => {
      // Mock successful response with video data
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'base64',
        fetch: mockFetch,
      });

      const result = await model.generateVideo({
        prompt: 'A test video',
        outputFormat: 'base64',
      });

      expect(result.video).toBeDefined();
      expect(typeof result.video).toBe('string');
      expect(result.video).toMatch(/^data:video\/mp4;base64,/);
      
      // Verify it's valid base64
      const base64Part = (result.video as string).replace('data:video/mp4;base64,', '');
      expect(() => Buffer.from(base64Part, 'base64')).not.toThrow();
      
      // Verify metadata
      expect(result.metadata?.format).toBe('mp4');
    });

    it('should return Buffer when outputFormat is "buffer"', async () => {
      // Mock successful response with video data
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'buffer',
        fetch: mockFetch,
      });

      const result = await model.generateVideo({
        prompt: 'A test video',
        outputFormat: 'buffer',
      });

      expect(result.video).toBeDefined();
      expect(Buffer.isBuffer(result.video)).toBe(true);
      expect((result.video as Buffer).length).toBe(sampleVideoData.length);
      
      // Verify metadata
      expect(result.metadata?.format).toBe('mp4');
    });

    it('should default to base64 format when not specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        // No outputFormat specified
        fetch: mockFetch,
      });

      const result = await model.generateVideo({
        prompt: 'A test video',
        // No outputFormat in options either
      });

      expect(typeof result.video).toBe('string');
      expect(result.video).toMatch(/^data:video\/mp4;base64,/);
    });

    it('should use option outputFormat over model default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      // Model configured with base64 default
      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'base64', // Model default
        fetch: mockFetch,
      });

      // Override with buffer in the call
      const result = await model.generateVideo({
        prompt: 'A test video',
        outputFormat: 'buffer', // Override
      });

      // Should use the call-time option (buffer), not model default
      expect(Buffer.isBuffer(result.video)).toBe(true);
    });

    it('should return buffer format for animateImage when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.animateImage({
        prompt: 'Animate this image',
        image: Buffer.from('fake-image-data'),
        outputFormat: 'buffer',
      });

      expect(Buffer.isBuffer(result.video)).toBe(true);
    });

    it('should return base64 format for animateImage by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.animateImage({
        prompt: 'Animate this image',
        image: 'data:image/png;base64,dGVzdA==',
        // No outputFormat specified
      });

      expect(typeof result.video).toBe('string');
      expect(result.video).toMatch(/^data:video\/mp4;base64,/);
    });

    it('should preserve video content in buffer format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.generateVideo({
        prompt: 'A test video',
        outputFormat: 'buffer',
      });

      const buffer = result.video as Buffer;
      
      // Verify the content matches original data
      expect(buffer.length).toBe(sampleVideoData.length);
      for (let i = 0; i < sampleVideoData.length; i++) {
        expect(buffer[i]).toBe(sampleVideoData[i]);
      }
    });

    it('should preserve video content in base64 format (round-trip)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleVideoData.buffer),
      });

      const model = new VideoModel({
        chuteId: 'video-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.generateVideo({
        prompt: 'A test video',
        outputFormat: 'base64',
      });

      // Decode and verify
      const base64Part = (result.video as string).replace('data:video/mp4;base64,', '');
      const decoded = Buffer.from(base64Part, 'base64');
      
      expect(decoded.length).toBe(sampleVideoData.length);
      for (let i = 0; i < sampleVideoData.length; i++) {
        expect(decoded[i]).toBe(sampleVideoData[i]);
      }
    });
  });
});

