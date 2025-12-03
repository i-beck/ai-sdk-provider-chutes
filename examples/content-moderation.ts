/**
 * Content Moderation Example
 * 
 * Demonstrates:
 * - Analyzing content for moderation
 * - Category-specific checks
 * - Confidence scores
 * - Batch moderation
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get moderation model (replace with actual moderation chute ID)
  const moderationModel = chutes.moderationModel('your-moderation-chute-id');

  console.log('🛡️  Content Moderation Examples\n');

  // Example 1: Basic content moderation
  console.log('✅ Example 1: Basic Content Moderation');
  try {
    const result = await moderationModel.analyzeContent({
      content: 'This is a normal, safe piece of text.',
    });

    console.log('Moderation result:');
    console.log(`   Flagged: ${result.flagged ? '⚠️ YES' : '✅ NO'}`);
    console.log('\n   Categories:');
    result.categories.forEach(cat => {
      const icon = cat.flagged ? '⚠️' : '✅';
      console.log(`   ${icon} ${cat.category}: ${(cat.score * 100).toFixed(2)}%`);
    });
  } catch (error) {
    console.error('❌ Error analyzing content:', error);
  }

  console.log('\n---\n');

  // Example 2: Moderation with specific categories
  console.log('🔍 Example 2: Category-specific Moderation');
  try {
    const result = await moderationModel.analyzeContent({
      content: 'Sample text for moderation',
      categories: ['hate', 'violence', 'sexual', 'self-harm'],
    });

    console.log('Moderation with specific categories:');
    console.log(`   Overall flagged: ${result.flagged ? '⚠️ YES' : '✅ NO'}`);
    console.log('\n   Category scores:');
    result.categories.forEach(cat => {
      const bar = '█'.repeat(Math.floor(cat.score * 20));
      console.log(`   ${cat.category.padEnd(12)}: ${bar} ${(cat.score * 100).toFixed(1)}%`);
    });
  } catch (error) {
    console.error('❌ Error with category-specific moderation:', error);
  }

  console.log('\n---\n');

  // Example 3: Batch moderation
  console.log('📦 Example 3: Batch Content Moderation');
  
  const contentBatch = [
    'Welcome to our community!',
    'This is a helpful tutorial.',
    'Great question! Here\'s the answer.',
    'Check out this amazing resource.',
  ];

  console.log(`Moderating ${contentBatch.length} pieces of content...\n`);

  for (let i = 0; i < contentBatch.length; i++) {
    try {
      const result = await moderationModel.analyzeContent({
        content: contentBatch[i],
      });

      const status = result.flagged ? '⚠️ FLAGGED' : '✅ SAFE';
      const maxScore = Math.max(...result.categories.map(c => c.score));
      
      console.log(`${i + 1}. ${status} (max score: ${(maxScore * 100).toFixed(1)}%)`);
      console.log(`   "${contentBatch[i].substring(0, 50)}..."`);
    } catch (error) {
      console.error(`❌ Error moderating item ${i + 1}:`, error);
    }
  }

  console.log('\n---\n');

  // Example 4: Custom threshold handling
  console.log('⚖️  Example 4: Custom Threshold Handling');
  try {
    const customThreshold = 0.3; // 30% confidence threshold

    const result = await moderationModel.analyzeContent({
      content: 'This content might be borderline.',
    });

    console.log('Moderation with custom threshold:');
    console.log(`   System flagged: ${result.flagged ? '⚠️ YES' : '✅ NO'}`);
    
    // Apply custom threshold
    const customFlagged = result.categories.some(cat => cat.score > customThreshold);
    console.log(`   Custom threshold (${(customThreshold * 100)}%): ${customFlagged ? '⚠️ YES' : '✅ NO'}`);
    
    console.log('\n   Categories above custom threshold:');
    result.categories
      .filter(cat => cat.score > customThreshold)
      .forEach(cat => {
        console.log(`   ⚠️ ${cat.category}: ${(cat.score * 100).toFixed(2)}%`);
      });
  } catch (error) {
    console.error('❌ Error with custom threshold:', error);
  }

  console.log('\n---\n');

  // Example 5: Real-time moderation pipeline
  console.log('🔄 Example 5: Real-time Moderation Pipeline');
  
  async function moderateAndLog(content: string, source: string) {
    try {
      const result = await moderationModel.analyzeContent({ content });
      
      if (result.flagged) {
        console.log(`⚠️  [${source}] FLAGGED content detected!`);
        const flaggedCategories = result.categories
          .filter(cat => cat.flagged)
          .map(cat => cat.category);
        console.log(`   Categories: ${flaggedCategories.join(', ')}`);
        return false; // Would not allow
      } else {
        console.log(`✅ [${source}] Content approved`);
        return true; // Would allow
      }
    } catch (error) {
      console.error(`❌ [${source}] Moderation error:`, error);
      return false; // Fail closed
    }
  }

  const testInputs = [
    { content: 'Hello, nice to meet you!', source: 'User Comment' },
    { content: 'Check out my website!', source: 'User Post' },
    { content: 'This is helpful information.', source: 'Forum Reply' },
  ];

  for (const input of testInputs) {
    await moderateAndLog(input.content, input.source);
  }
}

// Run examples
main().catch(console.error);

