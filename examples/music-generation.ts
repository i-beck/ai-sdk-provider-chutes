/**
 * Music Generation Example
 * 
 * Demonstrates:
 * - AI music generation from text prompts
 * - Duration control
 * - Different musical styles
 * - Output formats
 */

import { createChutes } from '@chutes-ai/ai-sdk-provider';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Create provider instance
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  // Get audio model (Music - replace with actual music generation chute ID)
  const audioModel = chutes.audioModel('your-music-chute-id');

  console.log('🎵 Music Generation Examples\n');

  // Example 1: Basic music generation
  console.log('🎹 Example 1: Basic Music Generation');
  try {
    const result = await audioModel.generateMusic({
      prompt: 'Upbeat electronic dance music with synthesizers',
      duration: 10, // 10 seconds
      outputFormat: 'buffer',
    });

    console.log('✅ Music generated successfully!');
    
    if (Buffer.isBuffer(result.audio)) {
      const outputPath = path.join(__dirname, 'output-music-1.mp3');
      fs.writeFileSync(outputPath, result.audio);
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Duration: ${result.metadata?.duration}s`);
    }
  } catch (error) {
    console.error('❌ Error generating music:', error);
  }

  console.log('\n---\n');

  // Example 2: Different musical styles
  console.log('🎼 Example 2: Different Musical Styles');
  
  const styles = [
    {
      prompt: 'Calm piano melody with soft strings, peaceful and relaxing',
      name: 'Calm Piano',
      duration: 15,
    },
    {
      prompt: 'Energetic rock guitar with drums, powerful and intense',
      name: 'Rock Guitar',
      duration: 15,
    },
    {
      prompt: 'Smooth jazz saxophone with double bass, sophisticated and mellow',
      name: 'Smooth Jazz',
      duration: 15,
    },
    {
      prompt: 'Ambient electronic soundscape, atmospheric and ethereal',
      name: 'Ambient Electronic',
      duration: 20,
    },
  ];

  for (const style of styles) {
    try {
      const result = await audioModel.generateMusic({
        prompt: style.prompt,
        duration: style.duration,
        outputFormat: 'buffer',
      });

      console.log(`✅ Generated: ${style.name}`);
      
      if (Buffer.isBuffer(result.audio)) {
        const filename = `output-${style.name.toLowerCase().replace(/\s+/g, '-')}.mp3`;
        const outputPath = path.join(__dirname, filename);
        fs.writeFileSync(outputPath, result.audio);
        console.log(`   Saved to: ${outputPath}`);
      }
    } catch (error) {
      console.error(`❌ Error generating ${style.name}:`, error);
    }
  }

  console.log('\n---\n');

  // Example 3: Long-form music generation
  console.log('🎶 Example 3: Long-form Music Generation');
  try {
    const result = await audioModel.generateMusic({
      prompt: 'Epic orchestral cinematic music with rising tension and dramatic crescendo',
      duration: 30, // 30 seconds
      outputFormat: 'base64',
    });

    console.log('✅ Long-form music generated!');
    console.log(`   Duration: ${result.metadata?.duration}s`);
    console.log(`   Output format: base64 data URI`);
    console.log(`   Length: ${result.audio.length} chars`);
  } catch (error) {
    console.error('❌ Error with long-form generation:', error);
  }

  console.log('\n---\n');

  // Example 4: Genre-specific generation
  console.log('🎸 Example 4: Genre-specific Music');
  
  const genres = [
    'Classical baroque harpsichord composition',
    'Hip-hop beat with bass and drums',
    'Country music with acoustic guitar and harmonica',
    'Reggae rhythm with offbeat guitar strums',
  ];

  for (const genre of genres) {
    try {
      const result = await audioModel.generateMusic({
        prompt: genre,
        duration: 12,
        outputFormat: 'buffer',
      });

      console.log(`✅ Generated: ${genre}`);
    } catch (error) {
      console.error(`❌ Error generating "${genre}":`, error);
    }
  }
}

// Run examples
main().catch(console.error);

