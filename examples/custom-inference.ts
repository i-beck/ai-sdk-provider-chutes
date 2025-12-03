/**
 * Custom Inference Example
 * 
 * Demonstrates:
 * - Single prediction inference
 * - Batch inference processing
 * - Job status checking
 * - Webhook integration
 * - Priority handling
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get inference model (replace with actual inference chute ID)
  const inferenceModel = chutes.inferenceModel('your-inference-chute-id');

  console.log('🔮 Custom Inference Examples\n');

  // Example 1: Single prediction
  console.log('🎯 Example 1: Single Prediction');
  try {
    const result = await inferenceModel.predict({
      modelId: 'your-model-id',
      input: {
        text: 'Sample input for inference',
        parameters: {
          temperature: 0.7,
          max_tokens: 100,
        },
      },
    });

    console.log('✅ Prediction completed!');
    console.log('   Output:', JSON.stringify(result.output, null, 2));
    
    if (result.jobId) {
      console.log(`   Job ID: ${result.jobId}`);
    }
  } catch (error) {
    console.error('❌ Error with prediction:', error);
  }

  console.log('\n---\n');

  // Example 2: Batch inference
  console.log('📦 Example 2: Batch Inference');
  try {
    const inputs = [
      { text: 'First input sample', id: 1 },
      { text: 'Second input sample', id: 2 },
      { text: 'Third input sample', id: 3 },
    ];

    const result = await inferenceModel.batch({
      modelId: 'your-model-id',
      inputs,
      priority: 'normal',
    });

    console.log('✅ Batch inference submitted!');
    
    if (result.jobId) {
      console.log(`   Job ID: ${result.jobId}`);
      console.log(`   Status: ${result.status}`);
    }
    
    if (result.outputs) {
      console.log(`   Results: ${result.outputs.length} outputs`);
      result.outputs.forEach((output, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(output).substring(0, 50)}...`);
      });
    }
  } catch (error) {
    console.error('❌ Error with batch inference:', error);
  }

  console.log('\n---\n');

  // Example 3: Job status checking
  console.log('⏳ Example 3: Job Status Checking');
  try {
    // First, submit a job
    const submitResult = await inferenceModel.predict({
      modelId: 'your-model-id',
      input: { text: 'Long-running task' },
    });

    if (submitResult.jobId) {
      const jobId = submitResult.jobId;
      console.log(`✅ Job submitted: ${jobId}`);
      
      // Check status
      const statusResult = await inferenceModel.getStatus({
        jobId,
      });

      console.log('   Job Status:');
      console.log(`   - Status: ${statusResult.status}`);
      console.log(`   - Created: ${statusResult.createdAt}`);
      
      if (statusResult.status === 'completed') {
        console.log('   - Result:', JSON.stringify(statusResult.result, null, 2));
      } else if (statusResult.status === 'failed') {
        console.log(`   - Error: ${statusResult.error}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking job status:', error);
  }

  console.log('\n---\n');

  // Example 4: Webhook-based inference
  console.log('🔔 Example 4: Webhook-based Inference');
  try {
    const result = await inferenceModel.predict({
      modelId: 'your-model-id',
      input: {
        text: 'This will send results to webhook',
      },
      webhookUrl: 'https://your-domain.com/webhook/inference-results',
      priority: 'high',
    });

    console.log('✅ Inference submitted with webhook!');
    console.log(`   Job ID: ${result.jobId}`);
    console.log('   Results will be sent to webhook when ready');
  } catch (error) {
    console.error('❌ Error with webhook inference:', error);
  }

  console.log('\n---\n');

  // Example 5: Priority-based processing
  console.log('⚡ Example 5: Priority-based Processing');
  
  const priorities: Array<'low' | 'normal' | 'high'> = ['low', 'normal', 'high'];

  for (const priority of priorities) {
    try {
      const result = await inferenceModel.predict({
        modelId: 'your-model-id',
        input: {
          text: `Task with ${priority} priority`,
        },
        priority,
      });

      console.log(`✅ ${priority.toUpperCase()} priority task submitted`);
      if (result.jobId) {
        console.log(`   Job ID: ${result.jobId}`);
      }
    } catch (error) {
      console.error(`❌ Error with ${priority} priority:`, error);
    }
  }

  console.log('\n---\n');

  // Example 6: Polling for job completion
  console.log('🔄 Example 6: Polling for Job Completion');
  try {
    // Submit job
    const submitResult = await inferenceModel.predict({
      modelId: 'your-model-id',
      input: { text: 'Job to poll' },
    });

    if (submitResult.jobId) {
      const jobId = submitResult.jobId;
      console.log(`✅ Job submitted: ${jobId}`);
      console.log('   Polling for completion...');

      // Poll until complete (with max attempts)
      const maxAttempts = 10;
      const pollInterval = 2000; // 2 seconds

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const status = await inferenceModel.getStatus({ jobId });
        
        console.log(`   Attempt ${attempt}: ${status.status}`);

        if (status.status === 'completed') {
          console.log('   ✅ Job completed!');
          console.log('   Result:', JSON.stringify(status.result, null, 2));
          break;
        } else if (status.status === 'failed') {
          console.log(`   ❌ Job failed: ${status.error}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error with polling:', error);
  }
}

// Run examples
main().catch(console.error);

