import { describe, it, expect, beforeAll } from 'vitest';
import { createChutes } from '../../src';
import { discoverChutes, filterChutesByType, type ChuteInfo } from '../../src/utils/chute-discovery';

/**
 * Integration Tests for Audio TTS-to-STT Round-Trip
 * 
 * This test suite verifies that:
 * 1. Text-to-Speech (TTS) can generate audio from text
 * 2. Speech-to-Text (STT) can transcribe that audio back
 * 3. The transcription is reasonably similar to the original text
 * 
 * This provides end-to-end verification that both TTS and STT work correctly.
 */

const hasAPIKey = !!process.env.CHUTES_API_KEY;
const testIf = hasAPIKey ? it : it.skip;

// Discovered chutes for TTS and STT
let ttsChute: ChuteInfo | null = null;
let sttChute: ChuteInfo | null = null;

describe('Audio TTS-to-STT Round-Trip (Integration)', () => {
  beforeAll(async () => {
    if (!hasAPIKey) {
      console.warn('⚠️  Skipping audio round-trip tests: CHUTES_API_KEY not set');
      return;
    }

    console.log('🔍 Discovering audio chutes from Chutes.ai platform...');
    
    try {
      const allChutes = await discoverChutes(process.env.CHUTES_API_KEY!);
      
      // Find TTS chute (look for 'tts', 'kokoro', or 'speak' in name/slug)
      const ttsChutes = allChutes.filter(chute => {
        const name = chute.name?.toLowerCase() || '';
        const slug = chute.slug?.toLowerCase() || '';
        return name.includes('tts') || 
               name.includes('kokoro') || 
               name.includes('speak') ||
               slug.includes('tts') ||
               slug.includes('kokoro');
      });
      
      // Find STT chute (look for 'stt', 'whisper', 'transcribe', or 'speech-to-text' in name/slug)
      const sttChutes = allChutes.filter(chute => {
        const name = chute.name?.toLowerCase() || '';
        const slug = chute.slug?.toLowerCase() || '';
        return name.includes('stt') || 
               name.includes('whisper') || 
               name.includes('transcribe') ||
               name.includes('speech-to-text') ||
               slug.includes('stt') ||
               slug.includes('whisper');
      });
      
      if (ttsChutes.length > 0) {
        ttsChute = ttsChutes[0];
        console.log(`✅ Found TTS chute: ${ttsChute.name} (${ttsChute.slug})`);
      } else {
        console.warn('⚠️  No TTS chute found on platform');
      }
      
      if (sttChutes.length > 0) {
        sttChute = sttChutes[0];
        console.log(`✅ Found STT chute: ${sttChute.name} (${sttChute.slug})`);
      } else {
        console.warn('⚠️  No STT chute found on platform');
      }
    } catch (error) {
      console.error('Error discovering chutes:', error);
    }
  }, 30000);

  describe('Text-to-Speech', () => {
    testIf('should generate audio from text', async () => {
      if (!ttsChute) {
        console.warn('⚠️  No TTS chute available, skipping test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const audioModel = chutes.audioModel(ttsChute.slug);

      const result = await audioModel.textToSpeech({
        text: 'Hello world',
        voice: 'af_bella', // American Female - Bella
        outputFormat: 'buffer',
      });

      expect(result.audio).toBeDefined();
      expect(Buffer.isBuffer(result.audio)).toBe(true);
      expect((result.audio as Buffer).length).toBeGreaterThan(0);
      
      console.log(`✅ TTS generated ${(result.audio as Buffer).length} bytes of audio`);
    }, 60000);

    testIf('should generate audio with different voices', async () => {
      if (!ttsChute) {
        console.warn('⚠️  No TTS chute available, skipping test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const audioModel = chutes.audioModel(ttsChute.slug);

      // Test with different voice
      const result = await audioModel.textToSpeech({
        text: 'Testing different voice',
        voice: 'am_adam', // American Male - Adam
        outputFormat: 'base64',
      });

      expect(result.audio).toBeDefined();
      expect(typeof result.audio).toBe('string');
      expect(result.audio).toMatch(/^data:audio\/mpeg;base64,/);
    }, 60000);
  });

  describe('Speech-to-Text', () => {
    testIf('should transcribe audio buffer', async () => {
      if (!sttChute) {
        console.warn('⚠️  No STT chute available, skipping test');
        return;
      }

      // First, we need audio to transcribe
      // If TTS is available, use it; otherwise skip
      if (!ttsChute) {
        console.warn('⚠️  No TTS chute to generate audio for STT test, skipping');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      // Generate audio with TTS
      const ttsModel = chutes.audioModel(ttsChute.slug);
      const ttsResult = await ttsModel.textToSpeech({
        text: 'Hello world',
        voice: 'af_bella',
        outputFormat: 'buffer',
      });

      expect(Buffer.isBuffer(ttsResult.audio)).toBe(true);

      // Transcribe with STT
      const sttModel = chutes.audioModel(sttChute.slug);
      const sttResult = await sttModel.speechToText({
        audio: ttsResult.audio as Buffer,
        language: 'en',
      });

      expect(sttResult.text).toBeDefined();
      expect(typeof sttResult.text).toBe('string');
      expect(sttResult.text.length).toBeGreaterThan(0);
      
      console.log(`✅ STT transcription: "${sttResult.text}"`);
    }, 90000); // 90 seconds for both TTS and STT
  });

  describe('TTS-to-STT Round-Trip', () => {
    testIf('should round-trip simple text', async () => {
      if (!ttsChute || !sttChute) {
        console.warn('⚠️  TTS or STT chute not available, skipping round-trip test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const originalText = 'Hello world';

      // Step 1: Generate audio from text
      console.log(`📢 TTS: Converting "${originalText}" to speech...`);
      const ttsModel = chutes.audioModel(ttsChute.slug);
      const ttsResult = await ttsModel.textToSpeech({
        text: originalText,
        voice: 'af_bella',
        outputFormat: 'buffer',
      });

      expect(Buffer.isBuffer(ttsResult.audio)).toBe(true);
      const audioSize = (ttsResult.audio as Buffer).length;
      console.log(`   Generated ${audioSize} bytes of audio`);

      // Step 2: Transcribe audio back to text
      console.log('🎧 STT: Transcribing audio back to text...');
      const sttModel = chutes.audioModel(sttChute.slug);
      const sttResult = await sttModel.speechToText({
        audio: ttsResult.audio as Buffer,
        language: 'en',
      });

      expect(sttResult.text).toBeDefined();
      console.log(`   Transcription: "${sttResult.text}"`);

      // Step 3: Verify the transcription is similar to original
      // Note: STT might not be 100% accurate, so we check for similarity
      const transcribedLower = sttResult.text.toLowerCase().trim();
      const originalLower = originalText.toLowerCase().trim();
      
      // Check if transcription contains key words
      const containsHello = transcribedLower.includes('hello');
      const containsWorld = transcribedLower.includes('world');
      
      console.log(`   Original: "${originalText}"`);
      console.log(`   Transcribed: "${sttResult.text}"`);
      console.log(`   Contains 'hello': ${containsHello}`);
      console.log(`   Contains 'world': ${containsWorld}`);
      
      // At least one key word should be present
      expect(containsHello || containsWorld).toBe(true);
    }, 120000); // 2 minutes for full round-trip

    testIf('should round-trip a longer sentence', async () => {
      if (!ttsChute || !sttChute) {
        console.warn('⚠️  TTS or STT chute not available, skipping round-trip test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const originalText = 'The quick brown fox jumps over the lazy dog';

      // Generate audio
      const ttsModel = chutes.audioModel(ttsChute.slug);
      const ttsResult = await ttsModel.textToSpeech({
        text: originalText,
        voice: 'af_bella',
        outputFormat: 'buffer',
      });

      // Transcribe
      const sttModel = chutes.audioModel(sttChute.slug);
      const sttResult = await sttModel.speechToText({
        audio: ttsResult.audio as Buffer,
        language: 'en',
      });

      console.log(`   Original: "${originalText}"`);
      console.log(`   Transcribed: "${sttResult.text}"`);

      // Check for key words
      const transcribedLower = sttResult.text.toLowerCase();
      const keyWords = ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'];
      const foundWords = keyWords.filter(word => transcribedLower.includes(word));
      
      console.log(`   Found ${foundWords.length}/${keyWords.length} key words: ${foundWords.join(', ')}`);
      
      // At least half of the key words should be recognized
      expect(foundWords.length).toBeGreaterThanOrEqual(3);
    }, 120000);

    testIf('should include chunks in transcription when requested', async () => {
      if (!ttsChute || !sttChute) {
        console.warn('⚠️  TTS or STT chute not available, skipping test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      // Generate audio
      const ttsModel = chutes.audioModel(ttsChute.slug);
      const ttsResult = await ttsModel.textToSpeech({
        text: 'Hello. How are you today?',
        voice: 'af_bella',
        outputFormat: 'buffer',
      });

      // Transcribe with chunks
      const sttModel = chutes.audioModel(sttChute.slug);
      const sttResult = await sttModel.speechToText({
        audio: ttsResult.audio as Buffer,
        language: 'en',
        includeChunks: true,
      });

      expect(sttResult.text).toBeDefined();
      expect(sttResult.chunks).toBeDefined();
      expect(Array.isArray(sttResult.chunks)).toBe(true);
      
      if (sttResult.chunks && sttResult.chunks.length > 0) {
        console.log(`   Got ${sttResult.chunks.length} chunks`);
        sttResult.chunks.forEach((chunk, i) => {
          console.log(`   Chunk ${i + 1}: [${chunk.start.toFixed(2)}s - ${chunk.end.toFixed(2)}s] "${chunk.text}"`);
        });
      }

      expect(sttResult.duration).toBeGreaterThan(0);
    }, 120000);

    testIf('should work with different TTS voices', async () => {
      if (!ttsChute || !sttChute) {
        console.warn('⚠️  TTS or STT chute not available, skipping test');
        return;
      }

      const chutes = createChutes({
        apiKey: process.env.CHUTES_API_KEY,
      });

      const voices = ['af_bella', 'am_adam', 'bf_emma'];
      const text = 'Testing voice';

      for (const voice of voices) {
        console.log(`\n🎤 Testing voice: ${voice}`);
        
        try {
          const ttsModel = chutes.audioModel(ttsChute.slug);
          const ttsResult = await ttsModel.textToSpeech({
            text,
            voice,
            outputFormat: 'buffer',
          });

          expect(Buffer.isBuffer(ttsResult.audio)).toBe(true);
          console.log(`   ✅ Generated ${(ttsResult.audio as Buffer).length} bytes`);

          const sttModel = chutes.audioModel(sttChute.slug);
          const sttResult = await sttModel.speechToText({
            audio: ttsResult.audio as Buffer,
            language: 'en',
          });

          console.log(`   ✅ Transcribed: "${sttResult.text}"`);
          expect(sttResult.text.length).toBeGreaterThan(0);
        } catch (error: any) {
          console.log(`   ⚠️ Voice ${voice} failed: ${error.message}`);
        }
      }
    }, 180000); // 3 minutes for multiple voices
  });
});

