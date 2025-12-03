import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioModel } from '../../src/models/audio-model';

describe('AudioModel', () => {
  describe('Type Definition', () => {
    it('should export AudioModel class', () => {
      expect(AudioModel).toBeDefined();
      expect(typeof AudioModel).toBe('function');
    });

    it('should instantiate with required configuration', () => {
      const model = new AudioModel({
        chuteId: 'audio-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model).toBeInstanceOf(AudioModel);
      expect(model.modelId).toBe('audio-test-chute');
      expect(model.provider).toBe('chutes');
    });

    it('should have textToSpeech method', () => {
      const model = new AudioModel({
        chuteId: 'audio-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.textToSpeech).toBeDefined();
      expect(typeof model.textToSpeech).toBe('function');
    });

    it('should have speechToText method', () => {
      const model = new AudioModel({
        chuteId: 'audio-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.speechToText).toBeDefined();
      expect(typeof model.speechToText).toBe('function');
    });

    it('should have generateMusic method', () => {
      const model = new AudioModel({
        chuteId: 'audio-test-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
      });
      
      expect(model.generateMusic).toBeDefined();
      expect(typeof model.generateMusic).toBe('function');
    });
  });

  describe('Type Interfaces', () => {
    it('should accept AudioSettings in configuration', () => {
      const model = new AudioModel({
        chuteId: 'audio-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        voice: 'af_bella',
        speed: 1.2,
      });
      
      expect(model).toBeInstanceOf(AudioModel);
    });

    it('should accept outputFormat option', () => {
      const modelBase64 = new AudioModel({
        chuteId: 'audio-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'base64',
      });
      expect(modelBase64).toBeInstanceOf(AudioModel);

      const modelBuffer = new AudioModel({
        chuteId: 'audio-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'buffer',
      });
      expect(modelBuffer).toBeInstanceOf(AudioModel);
    });

    it('should accept language option for STT', () => {
      const model = new AudioModel({
        chuteId: 'audio-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        language: 'en',
      });
      expect(model).toBeInstanceOf(AudioModel);
    });

    it('should accept duration option for music', () => {
      const model = new AudioModel({
        chuteId: 'audio-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        duration: 30,
      });
      expect(model).toBeInstanceOf(AudioModel);
    });
  });

  describe('Text-to-Speech Output Formats', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    // Sample MP3 audio data (simplified MP3 header + content)
    const sampleAudioData = new Uint8Array([
      // ID3 header
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00,
      // MP3 frame sync
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Some audio bytes
      0x54, 0x65, 0x73, 0x74, 0x41, 0x75, 0x64, 0x69,
    ]);

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return base64 data URI when outputFormat is "base64"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleAudioData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'tts-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'base64',
        fetch: mockFetch,
      });

      const result = await model.textToSpeech({
        text: 'Hello world',
        outputFormat: 'base64',
      });

      expect(result.audio).toBeDefined();
      expect(typeof result.audio).toBe('string');
      expect(result.audio).toMatch(/^data:audio\/mpeg;base64,/);
      expect(result.metadata?.format).toBe('mp3');
    });

    it('should return Buffer when outputFormat is "buffer"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleAudioData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'tts-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        outputFormat: 'buffer',
        fetch: mockFetch,
      });

      const result = await model.textToSpeech({
        text: 'Hello world',
        outputFormat: 'buffer',
      });

      expect(result.audio).toBeDefined();
      expect(Buffer.isBuffer(result.audio)).toBe(true);
      expect((result.audio as Buffer).length).toBe(sampleAudioData.length);
    });

    it('should send voice parameter when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleAudioData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'tts-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.textToSpeech({
        text: 'Hello world',
        voice: 'af_bella',
      });

      // Verify the request was made with the voice parameter
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.voice).toBe('af_bella');
      expect(body.text).toBe('Hello world');
    });

    it('should send speed parameter when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleAudioData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'tts-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.textToSpeech({
        text: 'Hello world',
        speed: 1.5,
      });

      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.speed).toBe(1.5);
    });

    it('should use /speak endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleAudioData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'tts-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.textToSpeech({ text: 'Test' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://tts-chute.chutes.ai/speak');
    });
  });

  describe('Speech-to-Text', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    // Sample STT response (array of chunks)
    const sampleSTTResponse = [
      { start: 0, end: 0.5, text: 'Hello ' },
      { start: 0.5, end: 1.0, text: 'world' },
    ];

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should transcribe audio from Buffer', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: Buffer.from('fake-audio-data'),
      });

      expect(result.text).toBe('Hello world');
      expect(result.duration).toBe(1.0);
      expect(result.chunkCount).toBe(2);
    });

    it('should transcribe audio from base64 data URI', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: 'data:audio/mpeg;base64,dGVzdA==',
      });

      expect(result.text).toBe('Hello world');
      
      // Verify base64 was extracted correctly
      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.audio_b64).toBe('dGVzdA=='); // Extracted from data URI
    });

    it('should transcribe audio from raw base64 string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: 'dGVzdEF1ZGlvRGF0YQ==', // Raw base64
      });

      expect(result.text).toBe('Hello world');
      
      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.audio_b64).toBe('dGVzdEF1ZGlvRGF0YQ==');
    });

    it('should send language parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.speechToText({
        audio: Buffer.from('test'),
        language: 'fr',
      });

      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.language).toBe('fr');
    });

    it('should include chunks when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: Buffer.from('test'),
        includeChunks: true,
      });

      expect(result.chunks).toBeDefined();
      expect(result.chunks?.length).toBe(2);
      expect(result.chunks?.[0].text).toBe('Hello ');
      expect(result.chunks?.[1].text).toBe('world');
    });

    it('should not include chunks by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: Buffer.from('test'),
      });

      expect(result.chunks).toBeUndefined();
    });

    it('should use /transcribe endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleSTTResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.speechToText({ audio: Buffer.from('test') });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://stt-chute.chutes.ai/transcribe');
    });

    it('should calculate duration from last chunk end time', async () => {
      const longResponse = [
        { start: 0, end: 1.5, text: 'First ' },
        { start: 1.5, end: 3.0, text: 'Second ' },
        { start: 3.0, end: 5.5, text: 'Third' },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(longResponse),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: Buffer.from('test'),
      });

      expect(result.duration).toBe(5.5);
      expect(result.chunkCount).toBe(3);
    });

    it('should handle empty chunks array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const model = new AudioModel({
        chuteId: 'stt-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.speechToText({
        audio: Buffer.from('test'),
      });

      expect(result.text).toBe('');
      expect(result.duration).toBe(0);
      expect(result.chunkCount).toBe(0);
    });
  });

  describe('Music Generation', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    const sampleMusicData = new Uint8Array([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x4D, 0x75, 0x73, 0x69, 0x63, 0x44, 0x61, 0x74,
    ]);

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate music from text prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleMusicData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'music-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.generateMusic({
        prompt: 'Upbeat electronic dance music',
      });

      expect(result.audio).toBeDefined();
      expect(typeof result.audio).toBe('string');
      expect(result.audio).toMatch(/^data:audio\/mpeg;base64,/);
    });

    it('should return Buffer when outputFormat is "buffer"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleMusicData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'music-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.generateMusic({
        prompt: 'Jazz music',
        outputFormat: 'buffer',
      });

      expect(Buffer.isBuffer(result.audio)).toBe(true);
    });

    it('should send duration parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleMusicData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'music-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.generateMusic({
        prompt: 'Rock music',
        duration: 45,
      });

      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.duration).toBe(45);
      expect(body.prompt).toBe('Rock music');
    });

    it('should use /generate endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleMusicData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'music-chute',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.generateMusic({ prompt: 'Test' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://music-chute.chutes.ai/generate');
    });

    it('should include duration in metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(sampleMusicData.buffer),
      });

      const model = new AudioModel({
        chuteId: 'music-test',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      const result = await model.generateMusic({
        prompt: 'Classical music',
        duration: 60,
      });

      expect(result.metadata?.duration).toBe(60);
      expect(result.metadata?.format).toBe('mp3');
    });
  });

  describe('URL Handling', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
        json: () => Promise.resolve([{ start: 0, end: 1, text: 'test' }]),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle full URL for TTS', async () => {
      const model = new AudioModel({
        chuteId: 'https://custom-tts.chutes.ai',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.textToSpeech({ text: 'Hello' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://custom-tts.chutes.ai/speak');
    });

    it('should handle full URL for STT', async () => {
      const model = new AudioModel({
        chuteId: 'https://custom-stt.chutes.ai',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.speechToText({ audio: Buffer.from('test') });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://custom-stt.chutes.ai/transcribe');
    });

    it('should handle full URL for music', async () => {
      const model = new AudioModel({
        chuteId: 'https://custom-music.chutes.ai',
        baseURL: 'https://test.chutes.ai',
        apiKey: 'test-key',
        fetch: mockFetch,
      });

      await model.generateMusic({ prompt: 'Test' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://custom-music.chutes.ai/generate');
    });
  });
});


