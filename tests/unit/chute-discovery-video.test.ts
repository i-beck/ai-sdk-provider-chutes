import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findFirstChuteByType } from '../../src/utils/chute-discovery';

describe('Video Chute Discovery - I2V Support', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it('should detect I2V chutes that only have /generate endpoint', async () => {
    // Mock the chute discovery API to return an I2V chute
    fetchMock
      // 1. Discovery API call
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                chute_id: 'i2v-test-uuid',
                slug: 'test-wan2-i2v',
                name: 'Wan-2.2-I2V-14B-Fast',
                standard_template: 'wan',
                description: 'Image to video model',
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 2. Availability check - /text2video returns 404 (doesn't exist)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'Not found' }),
          { status: 404 }
        )
      )
      // 3. Fallback check - /generate returns 400 (exists but needs proper params)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'Missing required field: image' }),
          { status: 400 }
        )
      );

    const result = await findFirstChuteByType('test-api-key', 'video');

    // Should find the chute despite /text2video 404
    expect(result).toBeTruthy();
    expect(result).toContain('test-wan2-i2v');
    
    // Should have tried /text2video first, then fallen back to /generate
    expect(fetchMock).toHaveBeenCalledTimes(3);
    
    // Check the availability check calls
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/text2video'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/generate'),
      expect.any(Object)
    );
  });

  it('should detect text2video chutes with /text2video endpoint', async () => {
    // Mock the chute discovery API to return a T2V chute
    fetchMock
      // 1. Discovery API call
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                chute_id: 't2v-test-uuid',
                slug: 'test-mochi-t2v',
                name: 'Mochi-1 Text2Video',
                standard_template: 'mochi',
                description: 'Text to video model',
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 2. Availability check - /text2video returns 400 (exists, needs params)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'Missing required field: prompt' }),
          { status: 400 }
        )
      );

    const result = await findFirstChuteByType('test-api-key', 'video');

    // Should find the chute immediately
    expect(result).toBeTruthy();
    expect(result).toContain('test-mochi-t2v');
    
    // Should only need 2 calls (discovery + one availability check)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should return null if both endpoints are unavailable', async () => {
    // Mock the chute discovery API to return a chute
    fetchMock
      // 1. Discovery API call
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                chute_id: 'down-chute-uuid',
                slug: 'test-down-chute',
                name: 'Down Chute',
                standard_template: 'wan',
                description: 'Video model',
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 2. /text2video returns 503 (infrastructure down)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'No infrastructure available' }),
          { status: 503 }
        )
      )
      // 3. /generate also returns 503
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: 'No infrastructure available' }),
          { status: 503 }
        )
      );

    const result = await findFirstChuteByType('test-api-key', 'video');

    // Should return null since both endpoints are unavailable
    expect(result).toBeNull();
  });
});

