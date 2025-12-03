import type { ImageModelV2 } from '@ai-sdk/provider';
import type { ChutesImageSettings } from '../types';
import { ChutesErrorHandler } from '../api/errors';

export interface ChutesImageModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
  chuteId?: string; // Optional chute UUID for error tracking
}

export class ChutesImageModel implements ImageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly maxImagesPerCall: number | undefined = 1; // Chutes.ai generates one image per API call

  private readonly settings: ChutesImageSettings;
  private readonly config: ChutesImageModelConfig;
  private readonly errorHandler: ChutesErrorHandler;
  private readonly chuteId?: string; // Store chute UUID for error tracking

  constructor(
    modelId: string,
    settings: ChutesImageSettings,
    config: ChutesImageModelConfig
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.chuteId = config.chuteId; // Capture chute ID if provided
    this.errorHandler = new ChutesErrorHandler();
  }

  async doGenerate(options: {
    prompt: string;
    n?: number;
    size?: string;
    aspectRatio?: string;
    quality?: string;
    style?: string;
    seed?: number;
  }): Promise<{
    images: string[];
    warnings: any[];
    response: { timestamp: Date; modelId: string; headers: Record<string, string> | undefined };
  }> {
    const {
      prompt,
      n = 1,
      size = '1024x1024',
      aspectRatio,
      quality,
      style,
      seed,
    } = options;

    // Chutes.ai generates one image per API call
    // Make multiple sequential requests if n > 1
    const allImages: string[] = [];
    const warnings: any[] = [];

    for (let i = 0; i < n; i++) {
      try {
        const image = await this.generateSingleImage({
          prompt,
          size,
          aspectRatio,
          quality,
          style,
          seed,
        });
        allImages.push(image);
      } catch (error) {
        warnings.push({
          type: 'image-generation-failed',
          message: `Failed to generate image ${i + 1} of ${n}`,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue generating remaining images even if one fails
      }
    }

    return {
      images: allImages,
      warnings,
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: undefined,
      },
    };
  }

  private async generateSingleImage(options: {
    prompt: string;
    size: string;
    aspectRatio?: string;
    quality?: string;
    style?: string;
    seed?: number;
  }): Promise<string> {
    const { prompt, size, aspectRatio, quality, style, seed } = options;

    const imageUrl = this.getImageGenerationUrl(this.modelId);

    // Parse size into width and height (e.g., "1024x1024" -> width: 1024, height: 1024)
    const [width, height] = size.split('x').map(s => parseInt(s.trim()));

    // Build request body matching Chutes API format (NOT OpenAI format)
    const body: Record<string, any> = {
      prompt,
    };

    // Add width/height if valid
    if (width && height) {
      body.width = width;
      body.height = height;
    }

    // Add optional parameters if provided
    // Note: aspectRatio is not sent to the API as Chutes determines aspect ratio from width/height
    if (quality) body.quality = quality;
    if (style) body.style = style;
    if (seed !== undefined) body.seed = seed;

    // Add snake_case parameters
    if (this.settings.responseFormat) {
      body.response_format = this.settings.responseFormat;
    }

    // Retry logic with exponential backoff for rate limits
    const maxRetries = 5;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await (this.config.fetch ?? fetch)(imageUrl, {
          method: 'POST',
          headers: {
            ...this.config.headers(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          // Check if it's a retryable error (429, 502, 503)
          const isRetryable = (response.status === 429 || response.status === 502 || response.status === 503);
          
          if (isRetryable && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential: 1s, 2s, 4s, 8s, 16s
            const errorType = response.status === 429 ? 'Rate limited' : 
                            response.status === 502 ? 'Bad Gateway' :
                            'Service Unavailable';
            console.warn(`⚠️  ${errorType} (${response.status}), retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
          
          throw await this.errorHandler.createAPIError(response, this.chuteId);
        }

        // Chutes /generate endpoint returns binary PNG/JPEG data directly, NOT JSON
        // Convert binary to base64 for AI SDK
        const binaryData = await response.arrayBuffer();
        const base64String = Buffer.from(binaryData).toString('base64');
        
        // Return base64 data URI
        return `data:image/png;base64,${base64String}`;
      } catch (error) {
        lastError = error;
        
        // If it's a rate limit error and we have retries left, continue
        if (error && typeof error === 'object' && 'statusCode' in error && 
            (error as any).statusCode === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️  Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For non-rate-limit errors, throw immediately
        if (!error || typeof error !== 'object' || !('statusCode' in error) || 
            (error as any).statusCode !== 429) {
          throw this.errorHandler.handleError(error);
        }
      }
    }

    // If we exhausted all retries, throw the last error
    console.error(`❌ Failed after ${maxRetries} retries`);
    throw this.errorHandler.handleError(lastError);
  }

  private getImageGenerationUrl(modelIdOrUrl: string): string {
    // Chutes image chutes use /generate endpoint, NOT OpenAI's /v1/images/generations
    // If it's a full chute URL, use it with /generate
    if (modelIdOrUrl.startsWith('http://') || modelIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(modelIdOrUrl);
        return `${url.protocol}//${url.hostname}/generate`;
      } catch {
        // Fall through
      }
    }
    
    // If it contains a chute-like pattern, treat it as chute slug
    if (modelIdOrUrl.includes('-') || modelIdOrUrl.includes('.chutes.ai')) {
      const slug = this.extractSlug(modelIdOrUrl);
      return `https://${slug}.chutes.ai/generate`;
    }
    
    // Otherwise, use management API (may support /v1/images/generations for OpenAI compatibility)
    return `${this.config.baseURL}/v1/images/generations`;
  }

  private extractModelIdentifier(modelIdOrUrl: string): string {
    // Extract the actual model name from URL or slug
    // For image models, common patterns:
    // - flux-dev, flux-schnell
    // - stable-diffusion-xl
    // - dall-e-3, dall-e-2
    
    const slug = this.extractSlug(modelIdOrUrl);
    
    // If it's a simple model name without chute prefix, return as-is
    if (!slug.startsWith('chutes-')) {
      return slug;
    }
    
    // Extract model from chute slug pattern
    // Example: chutes-flux-dev -> flux-dev
    const withoutPrefix = slug.replace(/^chutes-/, '');
    return withoutPrefix;
  }

  private extractSlug(modelIdOrUrl: string): string {
    // If it's already just a slug, return it
    if (!modelIdOrUrl.includes('://') && !modelIdOrUrl.includes('.')) {
      return modelIdOrUrl;
    }

    // Extract from URL
    try {
      const url = new URL(modelIdOrUrl.startsWith('http') ? modelIdOrUrl : `https://${modelIdOrUrl}`);
      const hostname = url.hostname;
      
      if (hostname.endsWith('.chutes.ai')) {
        return hostname.replace('.chutes.ai', '');
      }
      
      return hostname;
    } catch {
      const match = modelIdOrUrl.match(/([a-z0-9-]+)\.chutes\.ai/i);
      return match ? match[1] : modelIdOrUrl;
    }
  }
}

