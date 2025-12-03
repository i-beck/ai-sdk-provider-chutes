/**
 * Chute Discovery Utility
 * 
 * Dynamically discovers available chutes from the Chutes.ai platform using the Management API.
 * This allows the provider to work with any available chutes without hardcoding URLs.
 */

export interface ChuteInfo {
  chute_id: string; // UUID like "4f82321e-3e58-55da-ba44-051686ddbfe5"
  slug: string;
  name: string;
  standard_template?: string;
  description?: string;
  tagline?: string;
}

export interface ChutesAPIResponse {
  total: number;
  items: ChuteInfo[];
}

/**
 * Fetch all available chutes from the Chutes.ai Management API
 * @param apiKey - Chutes API key
 * @param includePublic - Whether to include public chutes (default: true)
 * @param limit - Maximum number of chutes to fetch (default: 500)
 * @returns Array of chute information
 */
export async function discoverChutes(
  apiKey: string,
  includePublic: boolean = true,
  limit: number = 500
): Promise<ChuteInfo[]> {
  if (!apiKey) {
    throw new Error('API key is required for chute discovery');
  }

  const queryParams = new URLSearchParams({
    include_public: String(includePublic),
    limit: String(limit),
  });

  const url = `https://api.chutes.ai/chutes/?${queryParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chutes: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ChutesAPIResponse;
    return data.items || [];
  } catch (error) {
    console.error('Error discovering chutes:', error);
    throw error;
  }
}

/**
 * Filter chutes by type (embedding, image, llm, etc.)
 * @param chutes - Array of chute information
 * @param type - Type of chutes to filter ('embedding' | 'image' | 'llm' | 'video' | 'tts' | 'stt' | 'music')
 * @returns Filtered array of chutes matching the type
 */
export function filterChutesByType(chutes: ChuteInfo[], type: string): ChuteInfo[] {
  const lowerType = type.toLowerCase();

  switch (lowerType) {
    case 'embedding':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        return (
          template === 'tei' || // Text Embeddings Inference template
          name.includes('embed') ||
          description.includes('embed') ||
          tagline.includes('embed')
        );
      });

    case 'image':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        // First, exclude LLM/text generation models
        const isLLM = template === 'vllm' || 
          name.includes('llm') ||
          name.includes('gpt') ||
          name.includes('claude') ||
          name.includes('gemma') ||
          name.includes('qwen') ||
          name.includes('mistral') ||
          name.includes('deepseek');
        
        if (isLLM) {
          return false;
        }
        
        // Exclude video generation models (including image-to-video)
        const isVideo = template === 'video' ||
          name.includes('video') ||
          name.includes('i2v') || // image-to-video
          name.includes('img2vid') ||
          description.includes('video') ||
          tagline.includes('video');
        
        if (isVideo) {
          return false;
        }
        
        // Then match image generation models
        return (
          template === 'diffusion' || // Diffusion models template
          name.includes('image') ||
          name.includes('diffusion') ||
          name.includes('flux') ||
          name.includes('sdxl') ||
          name.includes('sd-') || // stable-diffusion shorthand
          name.includes('stable') ||
          name.includes('dall-e') ||
          name.includes('dall-') ||
          description.includes('image generation') ||
          tagline.includes('image')
        );
      });

    case 'llm':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        
        return (
          template === 'vllm' || // vLLM template for text generation
          name.includes('llm') ||
          name.includes('gpt') ||
          name.includes('claude')
        );
      });

    case 'video':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        // Exclude vision-language models (VL) - they're not video generation
        const isVisionLanguage = name.includes('-vl-') || 
          name.includes('vision') || 
          description.includes('vision-language') ||
          description.includes('visual language model') ||
          template === 'vllm';
        
        if (isVisionLanguage) {
          return false;
        }
        
        return (
          template === 'video' ||
          template === 'video-generation' ||
          name.includes('video-gen') ||
          name.includes('t2v') || // text-to-video
          name.includes('i2v') || // image-to-video
          name.includes('text2video') ||
          name.includes('text-to-video') ||
          name.includes('img2vid') ||
          name.includes('image2video') ||
          name.includes('image-to-video') ||
          name.includes('video-diffusion') ||
          name.includes('videogen') ||
          description.includes('video generation') ||
          description.includes('text-to-video') ||
          description.includes('image-to-video') ||
          description.includes('generate video') ||
          description.includes('video synthesis') ||
          tagline.includes('video generation') ||
          tagline.includes('text-to-video')
        );
      });

    case 'tts':
    case 'text-to-speech':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        return (
          template === 'tts' ||
          template === 'kokoro' ||
          name.includes('tts') ||
          name.includes('text-to-speech') ||
          name.includes('speech synthesis') ||
          name.includes('kokoro') ||
          description.includes('text-to-speech') ||
          description.includes('speech synthesis') ||
          tagline.includes('text-to-speech')
        );
      });

    case 'stt':
    case 'speech-to-text':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        return (
          template === 'stt' ||
          template === 'whisper' ||
          name.includes('stt') ||
          name.includes('speech-to-text') ||
          name.includes('transcription') ||
          name.includes('whisper') ||
          description.includes('speech-to-text') ||
          description.includes('transcription') ||
          tagline.includes('speech-to-text')
        );
      });

    case 'music':
    case 'audio-generation':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        // Exclude TTS and STT models
        const isTTS = template === 'tts' || 
          name.includes('tts') || 
          name.includes('text-to-speech');
        const isSTT = template === 'stt' || 
          name.includes('stt') || 
          name.includes('speech-to-text');
        
        if (isTTS || isSTT) {
          return false;
        }
        
        return (
          template === 'music' ||
          template === 'musicgen' ||
          name.includes('music') ||
          name.includes('musicgen') ||
          name.includes('audio-gen') ||
          description.includes('music generation') ||
          description.includes('audio generation') ||
          tagline.includes('music')
        );
      });

    case 'moderation':
    case 'content-moderation':
      return chutes.filter((chute) => {
        const template = chute.standard_template?.toLowerCase() || '';
        const name = chute.name?.toLowerCase() || '';
        const description = chute.description?.toLowerCase() || '';
        const tagline = chute.tagline?.toLowerCase() || '';
        
        return (
          template === 'moderation' ||
          name.includes('moderation') ||
          name.includes('content-moderation') ||
          description.includes('content moderation') ||
          tagline.includes('moderation')
        );
      });

    default:
      return chutes;
  }
}

/**
 * Construct chute URL from slug
 * @param slug - Chute slug
 * @returns Full chute URL
 */
export function getChuteUrl(slug: string): string {
  if (slug.startsWith('http://') || slug.startsWith('https://')) {
    return slug;
  }
  return `https://${slug}.chutes.ai`;
}

/**
 * Check if a chute is available by making a test request
 * @param chuteUrl - Chute URL to check
 * @param apiKey - Chutes API key
 * @param type - Type of chute ('embedding' | 'image' | 'video')
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns True if chute is available, false otherwise
 */
async function isChuteAvailable(
  chuteUrl: string, 
  apiKey: string, 
  type: string,
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });
    
    // Determine endpoint(s) based on type
    let testEndpoints: Array<{ endpoint: string; body: any }>;
    
    if (type === 'embedding') {
      testEndpoints = [
        { endpoint: '/v1/embeddings', body: { input: 'test', model: null } }
      ];
    } else if (type === 'video') {
      // Video chutes can have TWO types of endpoints:
      // 1. Text-to-video: /text2video (T2V models like Mochi)
      // 2. Image-to-video: /generate (I2V models like Wan)
      // Try both in order - if first is 404, try second
      testEndpoints = [
        { endpoint: '/text2video', body: { prompt: 'test' } },
        { endpoint: '/generate', body: { prompt: 'test', image: 'data:image/png;base64,test' } }
      ];
    } else {
      // Image chutes use /generate
      testEndpoints = [
        { endpoint: '/generate', body: { prompt: 'test', width: 1, height: 1 } }
      ];
    }
    
    // Try each endpoint in sequence
    for (let i = 0; i < testEndpoints.length; i++) {
      const { endpoint, body } = testEndpoints[i];
      const url = `${chuteUrl}${endpoint}`;
      
      try {
        // Race between fetch and timeout
        const response = await Promise.race([
          fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }),
          timeoutPromise
        ]);
        
        // Check if we get a valid response (not 5xx errors)
        // 500/503 with infrastructure errors mean the chute isn't ready
        if (response.status >= 500) {
          const responseBody = await response.json().catch(() => ({})) as { detail?: string };
          const detail = responseBody.detail || '';
          
          // Check for various infrastructure unavailability messages
          if (
            detail.includes('No infrastructure available') ||
            detail.includes('No instances available') ||
            response.status === 503
          ) {
            // If this is a video chute and we have more endpoints to try, continue
            if (type === 'video' && i < testEndpoints.length - 1) {
              continue;
            }
            return false;
          }
        }
        
        // 429 rate limits also mean infrastructure is overloaded
        if (response.status === 429) {
          const responseBody = await response.json().catch(() => ({})) as { detail?: string };
          const detail = responseBody.detail || '';
          if (detail.includes('maximum capacity') || detail.includes('try again later')) {
            // If this is a video chute and we have more endpoints to try, continue
            if (type === 'video' && i < testEndpoints.length - 1) {
              continue;
            }
            return false;
          }
        }
        
        // 404 means endpoint doesn't exist
        if (response.status === 404) {
          const responseBody = await response.json().catch(() => ({})) as { detail?: string };
          const detail = responseBody.detail || '';
          
          // For video chutes, try the next endpoint
          if (type === 'video' && i < testEndpoints.length - 1) {
            console.debug(`Endpoint ${endpoint} not found, trying next...`);
            continue;
          }
          
          // For non-video or last endpoint, check if it's a deployment issue
          if (detail.includes('No matching cord found') || detail.includes('not found')) {
            console.debug(`❌ Chute not found (404): ${chuteUrl}`);
            return false;
          }
        }
        
        // Even 400 errors are okay - it means the service is running, just needs proper parameters
        if (response.status < 500 && response.status !== 429) {
          return true;
        }
      } catch (error) {
        // If this is a video chute and we have more endpoints to try, continue
        if (type === 'video' && i < testEndpoints.length - 1) {
          continue;
        }
        throw error;
      }
    }
    
    // If we've tried all endpoints and none worked
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === 'Timeout') {
      console.debug(`⏱️  Timeout checking chute availability: ${chuteUrl}`);
    } else {
      console.debug(`Failed to check chute availability: ${chuteUrl}`, error);
    }
    return false;
  }
}

/**
 * Find the first available chute of a specific type
 * Tries multiple chutes until finding one that's actually running
 * @param apiKey - Chutes API key
 * @param type - Type of chute to find
 * @param checkAvailability - Whether to check if chute is actually running (default: true)
 * @returns Chute URL or null if none found
 */
export async function findFirstChuteByType(
  apiKey: string,
  type: string,
  checkAvailability: boolean = true
): Promise<string | null> {
  const allChutes = await discoverChutes(apiKey);
  const filteredChutes = filterChutesByType(allChutes, type);
  
  if (filteredChutes.length === 0) {
    return null;
  }

  // If not checking availability, return the first one
  if (!checkAvailability) {
    return getChuteUrl(filteredChutes[0].slug);
  }

  // Try each chute until we find one that's available
  console.log(`Found ${filteredChutes.length} ${type} chutes, checking availability...`);
  
  for (const chute of filteredChutes) {
    const chuteUrl = getChuteUrl(chute.slug);
    console.log(`Checking ${chute.name} (${chuteUrl})...`);
    
    const available = await isChuteAvailable(chuteUrl, apiKey, type);
    if (available) {
      console.log(`✅ Found available ${type} chute: ${chuteUrl}`);
      return chuteUrl;
    } else {
      console.log(`❌ Chute not available (no infrastructure running)`);
    }
  }

  console.warn(`No available ${type} chutes found (all discovered chutes are not running)`);
  return null;
}

