/**
 * Therm Utility
 * 
 * Provides functionality to "warm up" chutes, making them ready for immediate use.
 * Named after thermals that gliders/parachutes use to gain altitude.
 */

import { ChutesAPIError } from '../api/errors';
import { VERSION } from '../version';

/**
 * Options for warming up a chute
 */
export interface WarmupOptions {
  /**
   * Base URL for the Chutes API
   * @default 'https://api.chutes.ai'
   */
  baseURL?: string;

  /**
   * Custom fetch implementation
   */
  fetch?: typeof fetch;

  /**
   * Custom headers to include in the request
   */
  headers?: Record<string, string>;
}

/**
 * Status of a chute's thermal state
 */
export type ChuteStatus = 'hot' | 'warming' | 'cold' | 'unknown';

/**
 * Result of a warmup operation
 */
export interface WarmupResult {
  /**
   * Whether the warmup request was successful
   */
  success: boolean;

  /**
   * The chute ID that was warmed up
   */
  chuteId: string;

  /**
   * Whether the chute is hot and ready for immediate use
   */
  isHot: boolean;

  /**
   * Current thermal status of the chute
   */
  status: ChuteStatus;

  /**
   * Number of instances currently available (0 if cold/warming)
   */
  instanceCount: number;

  /**
   * Log message from the API
   */
  log?: string;

  /**
   * Raw response data from the API
   */
  data?: unknown;
}

/**
 * Warm up a chute to prepare it for immediate use.
 * 
 * This sends a POST request to the Chutes API warmup endpoint, which triggers
 * the chute to spin up infrastructure so it's ready to handle requests.
 * 
 * @param chuteId - The UUID of the chute to warm up
 * @param apiKey - The Chutes API key for authentication
 * @param options - Optional configuration
 * @returns Promise resolving to the warmup result
 * @throws {ChutesAPIError} When the API returns an error response
 * @throws {Error} When chuteId or apiKey is missing
 * 
 * @example
 * ```typescript
 * import { warmUpChute } from '@chutes-ai/ai-sdk-provider';
 * 
 * const result = await warmUpChute('4f82321e-3e58-55da-ba44-051686ddbfe5', 'your-api-key');
 * console.log(result.success); // true
 * ```
 */
export async function warmUpChute(
  chuteId: string,
  apiKey: string,
  options: WarmupOptions = {}
): Promise<WarmupResult> {
  // Validate required parameters
  if (!chuteId || chuteId.trim() === '') {
    throw new Error('chuteId is required');
  }

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('apiKey is required');
  }

  const baseURL = options.baseURL ?? 'https://api.chutes.ai';
  const fetchFn = options.fetch ?? fetch;
  const url = `${baseURL}/chutes/warmup/${chuteId}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Provider': 'chutes-ai-sdk',
    'X-Provider-Version': VERSION,
    ...options.headers,
  };

  const response = await fetchFn(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let responseBody: unknown;
    let errorMessage: string;

    try {
      const text = await response.text();
      try {
        responseBody = JSON.parse(text);
        errorMessage = extractErrorMessage(responseBody) ?? `Warmup failed with status ${response.status}`;
      } catch {
        responseBody = text;
        errorMessage = text || `Warmup failed with status ${response.status}`;
      }
    } catch {
      errorMessage = `Warmup failed with status ${response.status}`;
    }

    throw new ChutesAPIError(
      errorMessage,
      response.status,
      chuteId,
      response,
      responseBody
    );
  }

  // Parse successful response
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    // Response might be empty or not JSON
    data = undefined;
  }

  // Parse the response into developer-friendly fields
  const parsed = parseWarmupResponse(data);

  return {
    success: true,
    chuteId,
    isHot: parsed.isHot,
    status: parsed.status,
    instanceCount: parsed.instanceCount,
    log: parsed.log,
    data,
  };
}

/**
 * Extract error message from response body
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (obj.error && typeof obj.error === 'object') {
      const error = obj.error as Record<string, unknown>;
      if (typeof error.message === 'string') return error.message;
    }
    if (typeof obj.detail === 'string') return obj.detail;
  }
  return undefined;
}

/**
 * Parse the warmup API response into developer-friendly fields
 */
function parseWarmupResponse(data: unknown): {
  status: ChuteStatus;
  isHot: boolean;
  instanceCount: number;
  log?: string;
} {
  if (!data || typeof data !== 'object') {
    return { status: 'unknown', isHot: false, instanceCount: 0 };
  }

  const obj = data as Record<string, unknown>;
  const rawStatus = typeof obj.status === 'string' ? obj.status.toLowerCase() : '';
  const log = typeof obj.log === 'string' ? obj.log : undefined;

  // Parse status
  const status: ChuteStatus =
    rawStatus === 'hot' ? 'hot' :
    rawStatus === 'warming' ? 'warming' :
    rawStatus === 'cold' ? 'cold' : 'unknown';

  // Parse instance count from log (e.g., "chute is hot, 1 instances available")
  let instanceCount = 0;
  if (log) {
    const match = log.match(/(\d+)\s*instances?\s*available/i);
    if (match) {
      instanceCount = parseInt(match[1], 10);
    }
  }

  return {
    status,
    isHot: status === 'hot',
    instanceCount,
    log,
  };
}

/**
 * Interface for the therm property on ChutesProvider
 */
export interface ThermInterface {
  /**
   * Warm up a chute to prepare it for immediate use
   * @param chuteId - The UUID of the chute to warm up
   * @returns Promise resolving to the warmup result
   */
  warmup(chuteId: string): Promise<WarmupResult>;

  /**
   * Create a thermal monitor for a chute.
   * The monitor polls the chute status and stops when hot.
   * Use reheat() to restart monitoring after the chute goes cold.
   * @param chuteId - The UUID of the chute to monitor
   * @param options - Monitor options
   * @returns ThermalMonitor instance
   */
  monitor(chuteId: string, options?: MonitorOptions): ThermalMonitor;
}

/**
 * Options for creating a ThermalMonitor
 */
export interface MonitorOptions {
  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  pollInterval?: number;

  /**
   * Whether to start polling immediately upon creation
   * @default true
   */
  autoStart?: boolean;
}

/**
 * A non-blocking thermal monitor for a chute.
 * 
 * - Polls the chute status at regular intervals
 * - Automatically stops polling when the chute becomes hot
 * - Can be signaled to restart polling with reheat()
 * 
 * @example
 * ```typescript
 * const monitor = chutes.therm.monitor('my-chute-id');
 * 
 * // Check status anytime (non-blocking)
 * console.log(monitor.status); // 'cold' | 'warming' | 'hot' | 'unknown'
 * 
 * // Wait for it to become hot (optional blocking)
 * await monitor.waitUntilHot();
 * 
 * // Later, if you suspect it went cold, signal to restart
 * monitor.reheat();
 * 
 * // Cleanup when done
 * monitor.stop();
 * ```
 */
export interface ThermalMonitor {
  /**
   * Current thermal status of the chute
   */
  readonly status: ChuteStatus;

  /**
   * The chute ID being monitored
   */
  readonly chuteId: string;

  /**
   * Whether the monitor is currently polling
   */
  readonly isPolling: boolean;

  /**
   * Signal the monitor to start checking again.
   * Call this when you suspect the chute may have gone cold.
   * No-op if already polling.
   */
  reheat(): void;

  /**
   * Stop polling entirely (cleanup).
   * Safe to call multiple times.
   */
  stop(): void;

  /**
   * Wait until the chute becomes hot.
   * Resolves immediately if already hot.
   * Starts polling if not already polling.
   * @param timeout - Timeout in ms (default: 120000 = 2 minutes)
   * @throws Error if timeout is reached before becoming hot
   */
  waitUntilHot(timeout?: number): Promise<void>;

  /**
   * Subscribe to status changes.
   * Callback is only called when status actually changes.
   * @param callback - Function to call when status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: ChuteStatus) => void): () => void;
}

/**
 * Create a ThermalMonitor for a chute.
 * 
 * The monitor polls the warmup endpoint at regular intervals and stops
 * automatically when the chute becomes hot. Use reheat() to restart
 * monitoring when needed.
 * 
 * @param chuteId - The UUID of the chute to monitor
 * @param apiKey - The Chutes API key for authentication
 * @param options - Monitor options
 * @returns ThermalMonitor instance
 */
export function createThermalMonitor(
  chuteId: string,
  apiKey: string,
  options: MonitorOptions & WarmupOptions = {}
): ThermalMonitor {
  const pollInterval = options.pollInterval ?? 30000;
  const autoStart = options.autoStart ?? true;

  let status: ChuteStatus = 'unknown';
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;
  const listeners = new Set<(status: ChuteStatus) => void>();

  // Notify all listeners of status change
  function notifyListeners(newStatus: ChuteStatus) {
    if (newStatus !== status) {
      status = newStatus;
      listeners.forEach(cb => cb(status));
    }
  }

  // Check the chute's thermal status
  async function checkStatus() {
    try {
      const result = await warmUpChute(chuteId, apiKey, {
        baseURL: options.baseURL,
        fetch: options.fetch,
        headers: options.headers,
      });
      notifyListeners(result.status);

      // STOP polling once hot - key behavior!
      if (result.status === 'hot') {
        stopPolling();
      }
    } catch {
      // On error, mark as unknown but keep trying
      notifyListeners('unknown');
    }
  }

  // Start the polling loop
  function startPolling() {
    if (isPolling) return; // Already polling

    isPolling = true;
    checkStatus(); // Immediate first check
    intervalId = setInterval(checkStatus, pollInterval);
  }

  // Stop the polling loop
  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isPolling = false;
  }

  // Auto-start if configured
  if (autoStart) {
    startPolling();
  }

  return {
    get status() { return status; },
    get chuteId() { return chuteId; },
    get isPolling() { return isPolling; },

    // Signal to start checking again
    reheat() {
      if (!isPolling) {
        startPolling();
      }
    },

    // Full cleanup
    stop() {
      stopPolling();
      listeners.clear();
    },

    // Optional blocking wait
    async waitUntilHot(timeout = 120000) {
      if (status === 'hot') return;

      // Start polling if not already
      if (!isPolling) {
        startPolling();
      }

      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for chute ${chuteId} to become hot`));
        }, timeout);

        const unsubscribe = this.onStatusChange((s) => {
          if (s === 'hot') {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve();
          }
        });
      });
    },

    // Subscribe to changes, returns unsubscribe function
    onStatusChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };
}

/**
 * Create a ThermInterface bound to a specific API key and configuration
 */
export function createThermInterface(
  apiKey: string,
  baseURL: string,
  customFetch?: typeof fetch,
  headers?: Record<string, string>
): ThermInterface {
  return {
    warmup: (chuteId: string) => warmUpChute(chuteId, apiKey, {
      baseURL,
      fetch: customFetch,
      headers,
    }),

    monitor: (chuteId: string, options?: MonitorOptions) => createThermalMonitor(chuteId, apiKey, {
      baseURL,
      fetch: customFetch,
      headers,
      ...options,
    }),
  };
}

