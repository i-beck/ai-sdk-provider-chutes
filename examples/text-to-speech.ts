/**
 * Text-to-Speech Example
 * 
 * Demonstrates:
 * - Basic text-to-speech
 * - Voice selection from 54 pre-defined voices
 * - Speed and language control
 * - Different output formats
 */

import { createChutes, listAvailableVoices, getVoicesByLanguage } from '@chutes-ai/ai-sdk-provider';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get audio model (TTS - replace with actual TTS chute ID)
  const audioModel = chutes.audioModel('your-tts-chute-id');

  console.log('🔊 Text-to-Speech Examples\n');

  // Example 1: List available voices
  console.log('🎤 Example 1: Available Voices');
  const allVoices = listAvailableVoices();
  console.log(`Total voices: ${allVoices.length}`);
  
  // Show first 5 voices
  console.log('\nFirst 5 voices:');
  allVoices.slice(0, 5).forEach(voice => {
    console.log(`   ${voice.id}: ${voice.name} (${voice.language}, ${voice.gender})`);
  });

  console.log('\n---\n');

  // Example 2: Get voices by language
  console.log('🌍 Example 2: Voices by Language');
  const englishVoices = getVoicesByLanguage('en-US');
  console.log(`English (US) voices: ${englishVoices.length}`);
  englishVoices.slice(0, 3).forEach(voice => {
    console.log(`   ${voice.id}: ${voice.name}`);
  });

  console.log('\n---\n');

  // Example 3: Basic text-to-speech
  console.log('💬 Example 3: Basic Text-to-Speech');
  try {
    const result = await audioModel.textToSpeech({
      text: 'Hello! This is a test of the text-to-speech system.',
      voice: 'af_bella', // American Female - Bella
      speed: 1.0,
      outputFormat: 'buffer',
    });

    console.log('✅ Speech generated successfully!');
    
    if (Buffer.isBuffer(result.audio)) {
      const outputPath = path.join(__dirname, 'output-speech.mp3');
      fs.writeFileSync(outputPath, result.audio);
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Duration: ${result.metadata?.duration}s`);
    }
  } catch (error) {
    console.error('❌ Error generating speech:', error);
  }

  console.log('\n---\n');

  // Example 4: Different voices and speeds
  console.log('🎭 Example 4: Multiple Voices and Speeds');
  
  const voiceTests = [
    { voice: 'af_bella', name: 'Bella (Female)', speed: 1.0 },
    { voice: 'am_adam', name: 'Adam (Male)', speed: 1.2 },
    { voice: 'bf_emma', name: 'Emma (British)', speed: 0.9 },
  ];

  for (const test of voiceTests) {
    try {
      const result = await audioModel.textToSpeech({
        text: 'The quick brown fox jumps over the lazy dog.',
        voice: test.voice,
        speed: test.speed,
        outputFormat: 'buffer',
      });

      console.log(`✅ Generated with ${test.name} at ${test.speed}x speed`);
      
      if (Buffer.isBuffer(result.audio)) {
        const filename = `output-${test.voice}.mp3`;
        const outputPath = path.join(__dirname, filename);
        fs.writeFileSync(outputPath, result.audio);
        console.log(`   Saved to: ${outputPath}`);
      }
    } catch (error) {
      console.error(`❌ Error with ${test.name}:`, error);
    }
  }

  console.log('\n---\n');

  // Example 5: Long text with base64 output
  console.log('📄 Example 5: Long Text with Base64 Output');
  try {
    const longText = `
      Artificial intelligence is transforming the way we live and work.
      From automated systems to creative applications, AI is making an impact
      across every industry. The future of AI holds endless possibilities.
    `;

    const result = await audioModel.textToSpeech({
      text: longText.trim(),
      voice: 'am_michael',
      speed: 1.0,
      outputFormat: 'base64',
    });

    console.log('✅ Long text converted to speech');
    console.log(`   Output format: base64 data URI`);
    console.log(`   Length: ${result.audio.length} chars`);
  } catch (error) {
    console.error('❌ Error with long text:', error);
  }
}

// Run examples
main().catch(console.error);

