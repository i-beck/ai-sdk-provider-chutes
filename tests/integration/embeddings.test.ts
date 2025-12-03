import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src/chutes-provider';
import { findFirstChuteByType } from '../../src/utils/chute-discovery';

/**
 * Integration Tests for Text Embeddings
 * 
 * Tests the embedding generation using Chutes.ai embedding models.
 * 
 * Embedding chutes are discovered dynamically via global warmup.
 * Fallback order:
 * 1. WARMED_EMBEDDING_CHUTE (set by global warmup - pre-warmed)
 * 2. DISCOVERED_EMBEDDING_CHUTE (manual override)
 * 3. Dynamic discovery via findFirstChuteByType (last resort)
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;

// Get embedding chute - prefer warmed chute from global setup
let DISCOVERED_EMBEDDING_CHUTE: string | null = 
  process.env.WARMED_EMBEDDING_CHUTE || 
  process.env.DISCOVERED_EMBEDDING_CHUTE || 
  null;

const testIf = hasAPIKey ? it : it.skip;

describe('Text Embeddings (Integration)', () => {
  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping embedding tests: CHUTES_API_KEY not set');
      return;
    }

    // Check if we have a pre-warmed or manual chute
    if (DISCOVERED_EMBEDDING_CHUTE) {
      const source = process.env.WARMED_EMBEDDING_CHUTE ? '(warmed)' : '(manual)';
      console.log(`✅ Using embedding chute ${source}: ${DISCOVERED_EMBEDDING_CHUTE}`);
    } else {
      // Fall back to dynamic discovery (slower, but works if global warmup failed)
      console.log('🔍 No pre-warmed embedding chute, discovering...');
      DISCOVERED_EMBEDDING_CHUTE = await findFirstChuteByType(process.env.CHUTES_API_KEY!, 'embedding');
      
      if (DISCOVERED_EMBEDDING_CHUTE) {
        console.log(`✅ Discovered embedding chute: ${DISCOVERED_EMBEDDING_CHUTE}`);
      } else {
        console.warn('⚠️  No embedding chutes found on platform. Skipping embedding tests.');
      }
    }
  }, 15000); // 15 second timeout (shorter since chute should be pre-warmed)

  testIf('should generate embedding for single text', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    const result = await embeddingModel.doEmbed({
      values: ['Hello, world!'],
    });

    // Should have one embedding
    expect(result.embeddings).toBeDefined();
    expect(result.embeddings.length).toBe(1);

    // Embedding should be array of numbers
    expect(Array.isArray(result.embeddings[0])).toBe(true);
    expect(result.embeddings[0].length).toBeGreaterThan(0);
    expect(typeof result.embeddings[0][0]).toBe('number');

    // Should have usage information
    expect(result.usage).toBeDefined();
    expect(result.usage.tokens).toBeGreaterThan(0);
  });

  testIf('should generate embeddings for multiple texts', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    const texts = [
      'The quick brown fox jumps over the lazy dog',
      'Machine learning is a subset of artificial intelligence',
      'TypeScript is a typed superset of JavaScript',
    ];

    const result = await embeddingModel.doEmbed({
      values: texts,
    });

    // Should have three embeddings
    expect(result.embeddings.length).toBe(3);

    // All embeddings should be valid
    for (const embedding of result.embeddings) {
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe('number');
    }

    // Embeddings should be different (not all zeros)
    const allSame = result.embeddings.every((emb, i) => 
      i === 0 || emb.every((val, j) => Math.abs(val - result.embeddings[0][j]) < 0.0001)
    );
    expect(allSame).toBe(false);
  });

  testIf('should handle empty text', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    const result = await embeddingModel.doEmbed({
      values: [''],
    });

    expect(result.embeddings.length).toBe(1);
    expect(result.embeddings[0].length).toBeGreaterThan(0);
  });

  testIf('should handle batch embedding with mixed length texts', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    const texts = [
      'Short',
      'A medium length sentence with more words',
      'This is a much longer text that contains multiple sentences and ideas. It talks about various topics and demonstrates how the embedding model handles longer inputs compared to shorter ones.',
    ];

    const result = await embeddingModel.doEmbed({
      values: texts,
    });

    expect(result.embeddings.length).toBe(3);
    
    // All should have same dimension regardless of input length
    const dimension = result.embeddings[0].length;
    expect(result.embeddings[1].length).toBe(dimension);
    expect(result.embeddings[2].length).toBe(dimension);
  });

  testIf('should respect maxEmbeddingsPerCall limit', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    // Check that maxEmbeddingsPerCall is defined
    expect(embeddingModel.maxEmbeddingsPerCall).toBeDefined();
    expect(embeddingModel.maxEmbeddingsPerCall).toBeGreaterThan(0);

    console.log(`Max embeddings per call: ${embeddingModel.maxEmbeddingsPerCall}`);
  });

  testIf('should support parallel embedding calls', async () => {
    if (!DISCOVERED_EMBEDDING_CHUTE) {
      console.warn('⚠️  No embedding chute available, skipping test');
      return;
    }

    const chutes = createChutes({
      apiKey: process.env.CHUTES_API_KEY,
    });

    const embeddingModel = chutes.textEmbeddingModel(DISCOVERED_EMBEDDING_CHUTE);
    
    // Should indicate if parallel calls are supported
    expect(embeddingModel.supportsParallelCalls).toBe(true);

    // Make multiple parallel calls
    const promises = [
      embeddingModel.doEmbed({ values: ['Test 1'] }),
      embeddingModel.doEmbed({ values: ['Test 2'] }),
      embeddingModel.doEmbed({ values: ['Test 3'] }),
    ];

    const results = await Promise.all(promises);

    expect(results.length).toBe(3);
    results.forEach(result => {
      expect(result.embeddings.length).toBe(1);
    });
  });
});

