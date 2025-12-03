import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('warmUpChute', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should send GET request to correct warmup endpoint', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await warmUpChute('test-chute-id', 'test-api-key');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.chutes.ai/chutes/warmup/test-chute-id',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key',
        }),
      })
    );
  });

  it('should return success result on 200 response', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'hot', log: 'chute is hot, 2 instances available' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.success).toBe(true);
    expect(result.chuteId).toBe('test-chute-id');
    expect(result.isHot).toBe(true);
    expect(result.status).toBe('hot');
    expect(result.instanceCount).toBe(2);
    expect(result.log).toBe('chute is hot, 2 instances available');
  });

  it('should throw ChutesAPIError on 401 unauthorized', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Invalid API key' }),
      text: async () => JSON.stringify({ error: 'Invalid API key' }),
    });

    await expect(warmUpChute('test-chute-id', 'invalid-key')).rejects.toThrow(ChutesAPIError);
  });

  it('should throw ChutesAPIError on 404 chute not found', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Chute not found' }),
      text: async () => JSON.stringify({ error: 'Chute not found' }),
    });

    await expect(warmUpChute('nonexistent-id', 'test-api-key')).rejects.toThrow(ChutesAPIError);
  });

  it('should throw ChutesAPIError on 500 server error', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Internal server error' }),
      text: async () => JSON.stringify({ error: 'Internal server error' }),
    });

    await expect(warmUpChute('test-chute-id', 'test-api-key')).rejects.toThrow(ChutesAPIError);
  });

  it('should handle network errors gracefully', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(warmUpChute('test-chute-id', 'test-api-key')).rejects.toThrow('fetch failed');
  });

  it('should use custom baseURL when provided', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await warmUpChute('test-chute-id', 'test-api-key', {
      baseURL: 'https://custom.api.com',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.api.com/chutes/warmup/test-chute-id',
      expect.any(Object)
    );
  });

  it('should use custom fetch when provided', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    const customFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await warmUpChute('test-chute-id', 'test-api-key', {
      fetch: customFetch,
    });

    expect(customFetch).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw error when chuteId is empty', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    await expect(warmUpChute('', 'test-api-key')).rejects.toThrow('chuteId is required');
  });

  it('should throw error when apiKey is empty', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    await expect(warmUpChute('test-chute-id', '')).rejects.toThrow('apiKey is required');
  });

  it('should parse hot status and return isHot=true', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'hot', log: 'chute is hot, 1 instances available' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.success).toBe(true);
    expect(result.isHot).toBe(true);
    expect(result.status).toBe('hot');
    expect(result.instanceCount).toBe(1);
    expect(result.log).toBe('chute is hot, 1 instances available');
  });

  it('should parse warming status and return isHot=false', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'warming', log: 'chute is warming up, 0 instances available' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.success).toBe(true);
    expect(result.isHot).toBe(false);
    expect(result.status).toBe('warming');
    expect(result.instanceCount).toBe(0);
  });

  it('should parse multiple instances from log', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'hot', log: 'chute is hot, 5 instances available' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.instanceCount).toBe(5);
  });

  it('should handle cold status', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'cold', log: 'chute is cold' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.isHot).toBe(false);
    expect(result.status).toBe('cold');
    expect(result.instanceCount).toBe(0);
  });

  it('should default to unknown status for unrecognized values', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'pending', log: 'some log' }),
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.isHot).toBe(false);
    expect(result.status).toBe('unknown');
  });

  it('should handle empty JSON response', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new Error('No JSON'); },
    });

    const result = await warmUpChute('test-chute-id', 'test-api-key');

    expect(result.success).toBe(true);
    expect(result.chuteId).toBe('test-chute-id');
    expect(result.isHot).toBe(false);
    expect(result.status).toBe('unknown');
    expect(result.instanceCount).toBe(0);
    expect(result.log).toBeUndefined();
  });

  it('should include custom headers when provided', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await warmUpChute('test-chute-id', 'test-api-key', {
      headers: { 'X-Custom-Header': 'custom-value' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Header': 'custom-value',
        }),
      })
    );
  });

  it('should extract error detail from response', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'No matching chute found!' }),
      text: async () => JSON.stringify({ detail: 'No matching chute found!' }),
    });

    await expect(warmUpChute('invalid-id', 'test-api-key'))
      .rejects.toThrow('No matching chute found!');
  });

  it('should include provider headers in request', async () => {
    const { warmUpChute } = await import('../../src/utils/therm');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await warmUpChute('test-chute-id', 'test-api-key');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Provider': 'chutes-ai-sdk',
          'X-Provider-Version': expect.any(String),
        }),
      })
    );
  });
});

describe('ChutesProvider.therm', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should have therm property on provider', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    const provider = createChutes({ apiKey: 'test-api-key' });
    
    expect(provider.therm).toBeDefined();
    expect(typeof provider.therm.warmup).toBe('function');
    expect(typeof provider.therm.monitor).toBe('function');
  });

  it('should call warmup endpoint via provider.therm.warmup()', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Warmed up' }),
    });

    const provider = createChutes({ apiKey: 'test-api-key' });
    const result = await provider.therm.warmup('test-chute-id');

    expect(result.success).toBe(true);
    expect(result.chuteId).toBe('test-chute-id');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.chutes.ai/chutes/warmup/test-chute-id',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key',
        }),
      })
    );
  });

  it('should use custom baseURL for therm.warmup()', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const provider = createChutes({ 
      apiKey: 'test-api-key',
      baseURL: 'https://custom.api.com',
    });
    await provider.therm.warmup('test-chute-id');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.api.com/chutes/warmup/test-chute-id',
      expect.any(Object)
    );
  });

  it('should throw ChutesAPIError when warmup fails via provider', async () => {
    const { createChutes } = await import('../../src/chutes-provider');
    const { ChutesAPIError } = await import('../../src/api/errors');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Chute not found' }),
      text: async () => JSON.stringify({ error: 'Chute not found' }),
    });

    const provider = createChutes({ apiKey: 'test-api-key' });
    
    await expect(provider.therm.warmup('nonexistent-id')).rejects.toThrow(ChutesAPIError);
  });
});

describe('ThermalMonitor', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('createThermalMonitor', () => {
    it('should create a monitor with initial unknown status', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { autoStart: false });
      
      expect(monitor.status).toBe('unknown');
      expect(monitor.chuteId).toBe('test-chute-id');
      expect(monitor.isPolling).toBe(false);
      
      monitor.stop();
    });

    it('should start polling automatically by default', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      // Should start polling immediately
      expect(monitor.isPolling).toBe(true);
      
      monitor.stop();
    });

    it('should not start polling when autoStart is false', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { autoStart: false });
      
      expect(monitor.isPolling).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      
      monitor.stop();
    });

    it('should update status after checking', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'warming', log: 'warming up' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      // Wait for the initial async checkStatus() to complete
      // Need to flush promises since the initial call is not timer-based
      await vi.waitFor(() => {
        expect(monitor.status).toBe('warming');
      });
      
      monitor.stop();
    });

    it('should stop polling automatically when status becomes hot', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'hot', log: 'chute is hot, 1 instances available' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      // Wait for the initial check to complete
      await vi.runOnlyPendingTimersAsync();
      
      expect(monitor.status).toBe('hot');
      expect(monitor.isPolling).toBe(false);
      
      monitor.stop();
    });

    it('should continue polling while not hot', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'cold' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'warming' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      // Wait for initial check to complete
      await vi.waitFor(() => {
        expect(monitor.status).toBe('cold');
      });
      expect(monitor.isPolling).toBe(true);
      
      // Advance timer for next poll
      await vi.advanceTimersByTimeAsync(1000);
      
      await vi.waitFor(() => {
        expect(monitor.status).toBe('warming');
      });
      expect(monitor.isPolling).toBe(true);
      
      monitor.stop();
    });

    it('should use custom poll interval', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 5000 });
      
      // Wait for initial check to complete
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Advance by 4 seconds - shouldn't poll yet
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Advance by 1 more second - should poll now
      await vi.advanceTimersByTimeAsync(1000);
      
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      monitor.stop();
    });
  });

  describe('reheat()', () => {
    it('should start polling when called on stopped monitor', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { autoStart: false });
      
      expect(monitor.isPolling).toBe(false);
      
      monitor.reheat();
      
      expect(monitor.isPolling).toBe(true);
      
      monitor.stop();
    });

    it('should restart polling after monitor stopped due to hot status', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'hot', log: 'hot' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'warming' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      // Wait for first check - becomes hot, stops polling
      await vi.waitFor(() => {
        expect(monitor.status).toBe('hot');
      });
      expect(monitor.isPolling).toBe(false);
      
      // Signal to reheat
      monitor.reheat();
      
      expect(monitor.isPolling).toBe(true);
      
      // Wait for reheat check to complete
      await vi.waitFor(() => {
        expect(monitor.status).toBe('warming');
      });
      
      monitor.stop();
    });

    it('should be a no-op when already polling', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      await vi.runOnlyPendingTimersAsync();
      expect(monitor.isPolling).toBe(true);
      const callsBefore = mockFetch.mock.calls.length;
      
      // Calling reheat while polling should not start a duplicate
      monitor.reheat();
      monitor.reheat();
      
      expect(mockFetch.mock.calls.length).toBe(callsBefore);
      
      monitor.stop();
    });
  });

  describe('stop()', () => {
    it('should stop polling', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      await vi.runOnlyPendingTimersAsync();
      expect(monitor.isPolling).toBe(true);
      
      monitor.stop();
      
      expect(monitor.isPolling).toBe(false);
      
      // Advance time - should not make more calls
      const callsBefore = mockFetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockFetch.mock.calls.length).toBe(callsBefore);
    });

    it('should be safe to call multiple times', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { autoStart: false });
      
      // Should not throw
      monitor.stop();
      monitor.stop();
      monitor.stop();
      
      expect(monitor.isPolling).toBe(false);
    });
  });

  describe('waitUntilHot()', () => {
    it('should resolve immediately if already hot', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'hot' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key');
      
      await vi.runOnlyPendingTimersAsync();
      expect(monitor.status).toBe('hot');
      
      // Should resolve immediately
      await monitor.waitUntilHot();
      
      monitor.stop();
    });

    it('should wait and resolve when status becomes hot', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'cold' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'warming' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'hot' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      let resolved = false;
      const waitPromise = monitor.waitUntilHot().then(() => { resolved = true; });
      
      // Wait for first check - cold
      await vi.waitFor(() => {
        expect(monitor.status).toBe('cold');
      });
      expect(resolved).toBe(false);
      
      // Advance and wait for second check - warming
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => {
        expect(monitor.status).toBe('warming');
      });
      expect(resolved).toBe(false);
      
      // Advance and wait for third check - hot
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => {
        expect(monitor.status).toBe('hot');
      });
      
      await waitPromise;
      expect(resolved).toBe(true);
      
      monitor.stop();
    });

    it('should reject on timeout', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      // Wait for initial check
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      // Create promise and immediately attach catch to prevent unhandled rejection
      let caughtError: Error | null = null;
      const waitPromise = monitor.waitUntilHot(5000).catch((e) => {
        caughtError = e;
      });
      
      // Advance past timeout
      await vi.advanceTimersByTimeAsync(6000);
      
      // Wait for the catch handler to run
      await waitPromise;
      
      // Verify we got the timeout error
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(/timeout/i);
      
      monitor.stop();
    });

    it('should start polling if not already polling', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'hot' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { autoStart: false });
      
      expect(monitor.isPolling).toBe(false);
      
      const waitPromise = monitor.waitUntilHot();
      
      // Should start polling
      expect(monitor.isPolling).toBe(true);
      
      await vi.runOnlyPendingTimersAsync();
      await waitPromise;
      
      monitor.stop();
    });
  });

  describe('onStatusChange()', () => {
    it('should call callback when status changes', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'cold' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'warming' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      const statusChanges: string[] = [];
      monitor.onStatusChange((status) => {
        statusChanges.push(status);
      });
      
      // First check
      await vi.runOnlyPendingTimersAsync();
      expect(statusChanges).toContain('cold');
      
      // Second check
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();
      expect(statusChanges).toContain('warming');
      
      monitor.stop();
    });

    it('should not call callback when status remains the same', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      const callback = vi.fn();
      monitor.onStatusChange(callback);
      
      // First check - cold (change from unknown)
      await vi.runOnlyPendingTimersAsync();
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Second check - still cold (no change)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();
      expect(callback).toHaveBeenCalledTimes(1);
      
      monitor.stop();
    });

    it('should return unsubscribe function', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'cold' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'warming' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      const callback = vi.fn();
      const unsubscribe = monitor.onStatusChange(callback);
      
      // First check
      await vi.runOnlyPendingTimersAsync();
      expect(callback).toHaveBeenCalled();
      
      // Unsubscribe
      unsubscribe();
      
      // Second check - callback should not be called
      callback.mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();
      expect(callback).not.toHaveBeenCalled();
      
      monitor.stop();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully and continue polling', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'hot' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      // Wait for first check to fail and set status to unknown
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      // Status stays unknown on error
      expect(monitor.status).toBe('unknown');
      expect(monitor.isPolling).toBe(true);
      
      // Second check succeeds
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => {
        expect(monitor.status).toBe('hot');
      });
      
      monitor.stop();
    });

    it('should handle 4xx/5xx responses and continue polling', async () => {
      const { createThermalMonitor } = await import('../../src/utils/therm');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'hot' }),
        });
      
      const monitor = createThermalMonitor('test-chute-id', 'test-api-key', { pollInterval: 1000 });
      
      // Wait for first check to fail
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      // Status stays unknown on error
      expect(monitor.status).toBe('unknown');
      expect(monitor.isPolling).toBe(true);
      
      // Second check succeeds
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => {
        expect(monitor.status).toBe('hot');
      });
      
      monitor.stop();
    });
  });

  describe('ChutesProvider.therm.monitor()', () => {
    it('should create monitor via provider.therm.monitor()', async () => {
      const { createChutes } = await import('../../src/chutes-provider');
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'cold' }),
      });
      
      const provider = createChutes({ apiKey: 'test-api-key' });
      const monitor = provider.therm.monitor('test-chute-id');
      
      expect(monitor.chuteId).toBe('test-chute-id');
      expect(monitor.isPolling).toBe(true);
      
      monitor.stop();
    });

    it('should pass options to monitor', async () => {
      const { createChutes } = await import('../../src/chutes-provider');
      
      const provider = createChutes({ apiKey: 'test-api-key' });
      const monitor = provider.therm.monitor('test-chute-id', { autoStart: false });
      
      expect(monitor.isPolling).toBe(false);
      
      monitor.stop();
    });
  });
});

