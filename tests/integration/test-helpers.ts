/**
 * Test Helpers for Integration Tests
 * 
 * Utilities to make integration tests more reliable in CI/CD environments
 */

/**
 * Retry a test function up to N times if it fails
 * Useful for integration tests that depend on external APIs with variable behavior
 * 
 * @param fn - The test function to run
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @param timeoutMs - Per-attempt timeout in milliseconds (default: no timeout)
 */
export async function retryOnFailure<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  timeoutMs?: number
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (timeoutMs) {
        // Race between the function and a timeout
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Attempt ${attempt + 1} timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
        return result;
      } else {
        return await fn();
      }
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        console.warn(`⚠️  Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Retry a test assertion up to N times
 * Useful when testing non-deterministic LLM behavior (e.g., tool calling)
 * 
 * @param assertion - The assertion function to run
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 */
export async function retryAssertion(
  assertion: () => void | Promise<void>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<void> {
  return retryOnFailure(async () => {
    await assertion();
  }, maxRetries, delayMs);
}

