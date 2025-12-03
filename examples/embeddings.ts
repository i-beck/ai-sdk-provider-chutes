/**
 * Text Embeddings Example
 * 
 * This example demonstrates how to generate text embeddings using the Chutes.ai provider.
 * 
 * ⚠️ IMPORTANT: As of November 2025, public embedding chutes on the Chutes.ai platform
 * do not expose accessible API endpoints. This example will fail with "404: No matching cord found!"
 * unless you have a private/deployed embedding chute.
 * 
 * To use embeddings, you need to:
 * 1. Deploy your own embedding chute (e.g., using BAAI/bge-m3 or similar)
 * 2. Use the deployed chute URL (e.g., https://your-embedding-chute.chutes.ai)
 * 
 * Run this example (when embeddings are available):
 * ```bash
 * npm run dev examples/embeddings.ts
 * ```
 */

import { createChutes } from '../src';
import 'dotenv/config';

async function main() {
  // Initialize the Chutes provider
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  console.log('🔢 Chutes.ai Embeddings Example\n');

  // You'll need to replace this with your deployed embedding chute URL
  const EMBEDDING_CHUTE = process.env.EMBEDDING_CHUTE_URL || 'https://your-embedding-chute.chutes.ai';
  
  if (!EMBEDDING_CHUTE || EMBEDDING_CHUTE.includes('your-embedding')) {
    console.error('❌ Error: Please set EMBEDDING_CHUTE_URL environment variable');
    console.error('   Example: export EMBEDDING_CHUTE_URL=https://your-embedding-chute.chutes.ai');
    process.exit(1);
  }

  console.log(`Using embedding chute: ${EMBEDDING_CHUTE}\n`);

  // Example 1: Single text embedding
  console.log('Example 1: Single text embedding');
  
  try {
    const embedModel = chutes.embeddingModel(EMBEDDING_CHUTE);
    
    const result = await embedModel.doEmbed({
      values: ['Hello, world!'],
    });

    console.log(`✅ Generated embedding`);
    console.log(`   Dimension: ${result.embeddings[0].length}`);
    console.log(`   First 5 values:`, result.embeddings[0].slice(0, 5));
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.statusCode === 404) {
      console.error('   This embedding chute is not accessible.');
      console.error('   Please deploy a private embedding chute and use its URL.');
    }
  }

  // Example 2: Batch embeddings
  console.log('\nExample 2: Batch embeddings');
  
  try {
    const embedModel = chutes.embeddingModel(EMBEDDING_CHUTE);
    
    const texts = [
      'The quick brown fox jumps over the lazy dog',
      'Machine learning is a subset of artificial intelligence',
      'Natural language processing enables computers to understand human language',
    ];

    const result = await embedModel.doEmbed({
      values: texts,
    });

    console.log(`✅ Generated ${result.embeddings.length} embeddings`);
    texts.forEach((text, i) => {
      console.log(`   ${i + 1}. "${text.substring(0, 40)}..."`);
      console.log(`      Dimension: ${result.embeddings[i].length}`);
    });
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }

  // Example 3: Semantic similarity
  console.log('\nExample 3: Computing semantic similarity');
  
  try {
    const embedModel = chutes.embeddingModel(EMBEDDING_CHUTE);
    
    const query = 'What is AI?';
    const documents = [
      'Artificial intelligence is the simulation of human intelligence by machines',
      'The weather today is sunny and warm',
      'Machine learning algorithms learn from data',
    ];

    // Get embeddings for query and documents
    const queryResult = await embedModel.doEmbed({ values: [query] });
    const docResults = await embedModel.doEmbed({ values: documents });

    // Compute cosine similarity
    const queryEmbedding = queryResult.embeddings[0];
    
    const similarities = docResults.embeddings.map((docEmbed) => {
      const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * docEmbed[i], 0);
      const queryMag = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
      const docMag = Math.sqrt(docEmbed.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (queryMag * docMag);
    });

    console.log(`Query: "${query}"`);
    console.log('\nRanked by similarity:');
    const ranked = documents
      .map((doc, i) => ({ doc, sim: similarities[i] }))
      .sort((a, b) => b.sim - a.sim);
    
    ranked.forEach(({ doc, sim }, i) => {
      console.log(`${i + 1}. ${(sim * 100).toFixed(1)}% - "${doc}"`);
    });
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);

