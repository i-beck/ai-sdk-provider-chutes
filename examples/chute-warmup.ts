/**
 * Chute Warmup (Therm) Example
 *
 * This example demonstrates how to use the "therm" feature to pre-warm chutes
 * before making requests, eliminating cold start latency.
 *
 * Run with: npx tsx examples/chute-warmup.ts
 */

import { createChutes, warmUpChute } from '../src';
import type { WarmupResult, ChuteStatus } from '../src';

// Ensure API key is set
if (!process.env.CHUTES_API_KEY) {
  console.error('Error: CHUTES_API_KEY environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('🌡️  Chute Warmup (Therm) Examples\n');
  console.log('='.repeat(50) + '\n');

  // Create provider
  const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });

  // Get a chute ID to warm up
  const allChutes = await chutes.listModels('llm');
  if (allChutes.length === 0) {
    console.log('No LLM chutes available');
    return;
  }

  const targetChute = allChutes[0];
  console.log(`Target chute: ${targetChute.name}`);
  console.log(`Chute ID: ${targetChute.chute_id}\n`);

  // ===== Example 1: Basic Warmup via Provider =====
  console.log('📌 Example 1: Basic Warmup via Provider');
  console.log('-'.repeat(40));

  try {
    const result = await chutes.therm.warmup(targetChute.chute_id);
    printWarmupResult(result);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}\n`);
  }

  // ===== Example 2: Standalone Function =====
  console.log('📌 Example 2: Standalone warmUpChute Function');
  console.log('-'.repeat(40));

  try {
    const result = await warmUpChute(
      targetChute.chute_id,
      process.env.CHUTES_API_KEY!
    );
    printWarmupResult(result);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}\n`);
  }

  // ===== Example 3: Status-Based Decision Making =====
  console.log('📌 Example 3: Status-Based Decision Making');
  console.log('-'.repeat(40));

  try {
    const result = await chutes.therm.warmup(targetChute.chute_id);

    // Make decisions based on status
    switch (result.status) {
      case 'hot':
        console.log('  ✅ Chute is HOT - Ready for requests!');
        console.log(`  📊 Available instances: ${result.instanceCount}`);
        if (result.instanceCount >= 2) {
          console.log('  🚀 Multiple instances available for parallel requests');
        }
        break;

      case 'warming':
        console.log('  ⏳ Chute is WARMING - Wait a few seconds');
        console.log('  💡 Tip: Retry in 5-10 seconds');
        break;

      case 'cold':
        console.log('  ❄️  Chute is COLD - Infrastructure spinning up');
        console.log('  💡 Tip: Wait 30-60 seconds for full warmup');
        break;

      case 'unknown':
        console.log('  ❓ Status unknown - Proceed with caution');
        break;
    }
    console.log();
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}\n`);
  }

  // ===== Example 4: Pre-Warming with Retry =====
  console.log('📌 Example 4: Pre-Warming with Retry');
  console.log('-'.repeat(40));

  async function ensureWarm(chuteId: string, maxAttempts = 3): Promise<WarmupResult | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`  Attempt ${attempt}/${maxAttempts}...`);

      try {
        const result = await chutes.therm.warmup(chuteId);

        if (result.isHot) {
          console.log(`  ✅ Warmed up after ${attempt} attempt(s)!`);
          return result;
        }

        console.log(`  Status: ${result.status}, waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(`  Error: ${(error as Error).message}`);
      }
    }

    console.log('  ❌ Failed to warm up after max attempts');
    return null;
  }

  await ensureWarm(targetChute.chute_id, 2);
  console.log();

  // ===== Example 5: Batch Warmup =====
  console.log('📌 Example 5: Batch Warmup Multiple Chutes');
  console.log('-'.repeat(40));

  // Get a few chutes to warm up
  const chutesToWarm = allChutes.slice(0, 3);

  console.log(`  Warming up ${chutesToWarm.length} chutes...\n`);

  const results = await Promise.allSettled(
    chutesToWarm.map(async (chute) => {
      const result = await chutes.therm.warmup(chute.chute_id);
      return { name: chute.name, result };
    })
  );

  results.forEach((outcome, index) => {
    const chuteName = chutesToWarm[index].name;
    if (outcome.status === 'fulfilled') {
      const { result } = outcome.value;
      const statusIcon = result.isHot ? '🔥' : result.status === 'warming' ? '⏳' : '❄️';
      console.log(`  ${statusIcon} ${chuteName}: ${result.status} (${result.instanceCount} instances)`);
    } else {
      console.log(`  ❌ ${chuteName}: ${outcome.reason.message}`);
    }
  });

  // ===== Example 6: ThermalMonitor (Non-Blocking) =====
  console.log('\n📌 Example 6: ThermalMonitor (Non-Blocking)');
  console.log('-'.repeat(40));

  // Create a monitor - starts polling immediately
  const monitor = chutes.therm.monitor(targetChute.chute_id, {
    pollInterval: 5000, // Poll every 5 seconds for demo
  });

  console.log(`  Initial status: ${monitor.status}`);
  console.log(`  Is polling: ${monitor.isPolling}`);

  // Subscribe to status changes
  const unsubscribe = monitor.onStatusChange((status) => {
    console.log(`  📡 Status changed: ${status}`);
  });

  // Wait for status update (non-blocking check)
  console.log('  Waiting for first status update...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`  Current status: ${monitor.status}`);

  // Demonstrate reheat (if already hot, it won't start polling again)
  if (!monitor.isPolling) {
    console.log('  Monitor stopped (chute is hot). Calling reheat()...');
    monitor.reheat();
    console.log(`  Is polling after reheat: ${monitor.isPolling}`);
  }

  // Cleanup
  unsubscribe();
  monitor.stop();
  console.log('  Monitor stopped and cleaned up.\n');

  // ===== Example 7: waitUntilHot with Monitor =====
  console.log('📌 Example 7: waitUntilHot with Monitor');
  console.log('-'.repeat(40));

  const monitor2 = chutes.therm.monitor(targetChute.chute_id, {
    autoStart: false, // Don't start polling immediately
  });

  console.log(`  Initial status: ${monitor2.status}`);
  console.log(`  Is polling: ${monitor2.isPolling}`);

  try {
    console.log('  Calling waitUntilHot (10 second timeout)...');
    await monitor2.waitUntilHot(10000);
    console.log(`  ✅ Chute is hot! Status: ${monitor2.status}`);
  } catch (error) {
    console.log(`  ❌ Timeout waiting for hot status: ${(error as Error).message}`);
  }

  monitor2.stop();
  console.log();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All examples completed!');
}

function printWarmupResult(result: WarmupResult) {
  console.log(`  success: ${result.success}`);
  console.log(`  isHot: ${result.isHot}`);
  console.log(`  status: ${result.status}`);
  console.log(`  instanceCount: ${result.instanceCount}`);
  console.log(`  log: ${result.log || '(none)'}`);
  console.log();
}

main().catch(console.error);

