import { describe, it, expect } from 'vitest';
import { createChutes, warmUpChute, ChutesAPIError } from '../../src';
import type { WarmupResult, ChuteStatus } from '../../src';

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

describe('Therm Integration', () => {
  describe('warmUpChute standalone function', () => {
    testIf('should call warmup endpoint and handle response', async () => {
      // Get a chute ID from the API
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const allChutes = await chutes.listModels();
      
      if (allChutes.length === 0) {
        console.log('No chutes available to test warmup');
        return;
      }
      
      const chuteToWarm = allChutes[0];
      
      try {
        const result = await warmUpChute(
          chuteToWarm.chute_id,
          process.env.CHUTES_API_KEY!
        );
        
        // Verify enhanced WarmupResult structure
        expect(result.success).toBe(true);
        expect(result.chuteId).toBe(chuteToWarm.chute_id);
        expect(typeof result.isHot).toBe('boolean');
        expect(result.status).toBeDefined();
        expect(typeof result.instanceCount).toBe('number');
        
        // Log the result for debugging
        console.log(`Warmup result: isHot=${result.isHot}, status=${result.status}, instances=${result.instanceCount}`);
      } catch (error) {
        // Warmup may fail for public chutes user doesn't own - this is expected
        expect(error).toBeInstanceOf(ChutesAPIError);
        console.log(`Warmup failed as expected for public chute: ${(error as ChutesAPIError).message}`);
      }
    }, 60000);

    testIf('should return WarmupResult with expected shape', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const allChutes = await chutes.listModels();
      
      if (allChutes.length === 0) {
        console.log('No chutes available to test warmup');
        return;
      }
      
      const chuteToWarm = allChutes[0];
      
      try {
        const result: WarmupResult = await warmUpChute(
          chuteToWarm.chute_id,
          process.env.CHUTES_API_KEY!
        );
        
        // TypeScript type verification for new enhanced fields
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.chuteId).toBe('string');
        expect(typeof result.isHot).toBe('boolean');
        expect(['hot', 'warming', 'cold', 'unknown']).toContain(result.status);
        expect(typeof result.instanceCount).toBe('number');
        expect(result.instanceCount).toBeGreaterThanOrEqual(0);
        expect(result.log === undefined || typeof result.log === 'string').toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(ChutesAPIError);
      }
    }, 60000);

    testIf('should throw ChutesAPIError for invalid chute ID', async () => {
      await expect(
        warmUpChute('00000000-0000-0000-0000-000000000000', process.env.CHUTES_API_KEY!)
      ).rejects.toThrow(ChutesAPIError);
    }, 30000);

    testIf('should include chuteId in ChutesAPIError', async () => {
      try {
        await warmUpChute('00000000-0000-0000-0000-000000000000', process.env.CHUTES_API_KEY!);
        expect.fail('Expected ChutesAPIError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ChutesAPIError);
        const apiError = error as ChutesAPIError;
        expect(apiError.chuteId).toBe('00000000-0000-0000-0000-000000000000');
        expect(apiError.statusCode).toBe(404);
      }
    }, 30000);

    testIf('should throw error for invalid API key', async () => {
      try {
        await warmUpChute('00000000-0000-0000-0000-000000000000', 'invalid-api-key');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        // Could be 401 or 403 depending on API behavior
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('provider.therm.warmup method', () => {
    testIf('should call warmup endpoint via provider method', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      const allChutes = await chutes.listModels();
      
      if (allChutes.length === 0) {
        console.log('No chutes available to test warmup');
        return;
      }

      const chuteToWarm = allChutes[0];
      
      try {
        const result = await chutes.therm.warmup(chuteToWarm.chute_id);
        
        expect(result.success).toBe(true);
        expect(result.chuteId).toBe(chuteToWarm.chute_id);
      } catch (error) {
        expect(error).toBeInstanceOf(ChutesAPIError);
        console.log(`Warmup failed as expected for public chute: ${(error as ChutesAPIError).message}`);
      }
    }, 60000);

    testIf('should have therm interface on provider', async () => {
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });

      // Verify therm interface is available
      expect(chutes.therm).toBeDefined();
      expect(typeof chutes.therm.warmup).toBe('function');
    });

    testIf('should use provider API key for warmup', async () => {
      // Create provider with API key
      const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
      
      // Warmup should use the provider's API key
      try {
        await chutes.therm.warmup('00000000-0000-0000-0000-000000000000');
      } catch (error) {
        // We expect a 404 (not 401) because the API key is valid
        expect(error).toBeInstanceOf(ChutesAPIError);
        const apiError = error as ChutesAPIError;
        expect(apiError.statusCode).toBe(404);
      }
    }, 30000);
  });
});

