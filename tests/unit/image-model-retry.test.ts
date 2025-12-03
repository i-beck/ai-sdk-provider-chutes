import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChutesImageModel } from '../../src/models/image-model';

describe('Image Model - 502 Retry Logic', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let model: ChutesImageModel;

  beforeEach(() => {
    fetchMock = vi.fn();
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
      fetch: fetchMock,
    };
    
    model = new ChutesImageModel('test-image-chute', {}, config);
  });

  it('should retry on 502 Bad Gateway errors', async () => {
    // First 2 attempts return 502, 3rd succeeds
    fetchMock
      .mockResolvedValueOnce(
        new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 502,
          statusText: 'Bad Gateway',
        })
      )
      .mockResolvedValueOnce(
        new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 502,
          statusText: 'Bad Gateway',
        })
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('fake-png-data'), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      );

    const result = await model.doGenerate({
      prompt: 'test prompt',
      n: 1,
      size: '512x512',
    });

    // Should have succeeded after retries
    expect(result.images.length).toBe(1);
    expect(result.warnings.length).toBe(0);
    
    // Should have made 3 fetch attempts
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should retry on 503 Service Unavailable errors', async () => {
    // First attempt returns 503, 2nd succeeds
    fetchMock
      .mockResolvedValueOnce(
        new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        })
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('fake-png-data'), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      );

    const result = await model.doGenerate({
      prompt: 'test prompt',
      n: 1,
      size: '512x512',
    });

    expect(result.images.length).toBe(1);
    expect(result.warnings.length).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries on persistent 502 errors', async () => {
    // All 6 attempts (1 initial + 5 retries) return 502
    for (let i = 0; i < 6; i++) {
      fetchMock.mockResolvedValueOnce(
        new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 502,
          statusText: 'Bad Gateway',
        })
      );
    }

    const result = await model.doGenerate({
      prompt: 'test prompt',
      n: 1,
      size: '512x512',
    });

    // Should have failed with a warning after exhausting retries
    expect(result.images.length).toBe(0);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].type).toBe('image-generation-failed');
    
    // Should have made 6 attempts (1 + 5 retries)
    expect(fetchMock).toHaveBeenCalledTimes(6);
  }, 35000); // Increase timeout: 1s + 2s + 4s + 8s + 16s = 31s + buffer

  it('should use exponential backoff for retries', async () => {
    // Mock Date.now to track time
    const originalDateNow = Date.now;
    let currentTime = 1000;
    const delays: number[] = [];
    
    global.Date.now = vi.fn(() => currentTime);

    // Mock setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = vi.fn((callback: any, delay: number) => {
      delays.push(delay);
      currentTime += delay;
      callback();
      return {} as any;
    }) as any;

    // First 2 attempts return 502, 3rd succeeds
    fetchMock
      .mockResolvedValueOnce(
        new Response('502', { status: 502 })
      )
      .mockResolvedValueOnce(
        new Response('502', { status: 502 })
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('ok'), { status: 200 })
      );

    await model.doGenerate({
      prompt: 'test',
      n: 1,
      size: '512x512',
    });

    // Restore mocks
    global.Date.now = originalDateNow;
    global.setTimeout = originalSetTimeout;

    // Should have exponential backoff: 1s, 2s
    expect(delays).toEqual([1000, 2000]);
  });
});

