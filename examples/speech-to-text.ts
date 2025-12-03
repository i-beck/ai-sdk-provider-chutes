/**
 * Speech-to-Text Example
 * 
 * Demonstrates:
 * - Audio transcription
 * - Different input formats (Buffer, base64, URL)
 * - Language detection
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get audio model (STT - replace with actual STT chute ID)
  const audioModel = chutes.audioModel('your-stt-chute-id');

  console.log('🎙️  Speech-to-Text Examples\n');

  // Example 1: Transcribe from audio file (Buffer)
  console.log('📁 Example 1: Transcribe from Audio File');
  try {
    // Read audio file (e.g., MP3, WAV)
    const audioPath = path.join(__dirname, 'sample-audio.mp3');
    
    // Check if file exists
    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);

      const result = await audioModel.speechToText({
        audio: audioBuffer,
        language: 'en', // Optional: specify language
      });

      console.log('✅ Transcription successful!');
      console.log(`   Text: "${result.text}"`);
      console.log(`   Language: ${result.metadata?.language}`);
      console.log(`   Duration: ${result.metadata?.duration}s`);
    } else {
      console.log('⚠️  Sample audio file not found, skipping...');
    }
  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
  }

  console.log('\n---\n');

  // Example 2: Transcribe from base64
  console.log('🔤 Example 2: Transcribe from Base64');
  try {
    // In real use, you'd have actual audio base64 data
    // This is just a placeholder example
    const audioPath = path.join(__dirname, 'sample-audio.mp3');
    
    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);
      const audioBase64 = audioBuffer.toString('base64');

      const result = await audioModel.speechToText({
        audio: audioBase64,
      });

      console.log('✅ Transcription from base64 successful!');
      console.log(`   Text: "${result.text}"`);
    } else {
      console.log('⚠️  Sample audio file not found, skipping...');
    }
  } catch (error) {
    console.error('❌ Error transcribing base64 audio:', error);
  }

  console.log('\n---\n');

  // Example 3: Transcribe from URL
  console.log('🌐 Example 3: Transcribe from URL');
  try {
    const audioUrl = 'https://example.com/sample-audio.mp3';

    const result = await audioModel.speechToText({
      audio: audioUrl,
    });

    console.log('✅ Transcription from URL successful!');
    console.log(`   Text: "${result.text}"`);
  } catch (error) {
    console.error('❌ Error transcribing from URL:', error);
    console.log('   (This is expected if the URL is not valid)');
  }

  console.log('\n---\n');

  // Example 4: Multiple language transcription
  console.log('🌍 Example 4: Multiple Languages');
  
  const languageTests = [
    { lang: 'en', name: 'English' },
    { lang: 'es', name: 'Spanish' },
    { lang: 'fr', name: 'French' },
    { lang: 'ja', name: 'Japanese' },
  ];

  for (const test of languageTests) {
    try {
      const audioPath = path.join(__dirname, `sample-${test.lang}.mp3`);
      
      if (fs.existsSync(audioPath)) {
        const audioBuffer = fs.readFileSync(audioPath);

        const result = await audioModel.speechToText({
          audio: audioBuffer,
          language: test.lang,
        });

        console.log(`✅ ${test.name} transcription: "${result.text}"`);
      } else {
        console.log(`⚠️  ${test.name} sample not found, skipping...`);
      }
    } catch (error) {
      console.error(`❌ Error with ${test.name}:`, error);
    }
  }
}

// Run examples
main().catch(console.error);

