import type { EmbeddingModelV2 } from '@ai-sdk/provider';
import type { ChutesEmbeddingSettings } from '../types';
import { ChutesErrorHandler } from '../api/errors';

export interface ChutesEmbeddingModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
  chuteId?: string; // Optional chute UUID for error tracking
}

export class ChutesEmbeddingModel implements EmbeddingModelV2<string> {
  readonly specificationVersion = 'v2' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly maxEmbeddingsPerCall = 100;
  readonly supportsParallelCalls = true;

  private readonly settings: ChutesEmbeddingSettings;
  private readonly config: ChutesEmbeddingModelConfig;
  private readonly errorHandler: ChutesErrorHandler;
  private readonly chuteId?: string; // Store chute UUID for error tracking

  constructor(
    modelId: string,
    settings: ChutesEmbeddingSettings,
    config: ChutesEmbeddingModelConfig
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.chuteId = config.chuteId; // Capture chute ID if provided
    this.errorHandler = new ChutesErrorHandler();
  }

  async doEmbed(options: { values: string[] }): Promise<{
    embeddings: number[][];
    usage: { tokens: number };
  }> {
    const { values } = options;

    // For Chutes.ai, embeddings might be accessed via:
    // 1. Dedicated embedding chute URL (https://{slug}.chutes.ai/v1/embeddings)
    // 2. Management API embeddings endpoint (https://api.chutes.ai/v1/embeddings with model ID)
    
    // Determine the URL to use
    const embeddingUrl = this.getEmbeddingUrl(this.modelId);

    try {
      const response = await (this.config.fetch ?? fetch)(embeddingUrl, {
        method: 'POST',
        headers: {
          ...this.config.headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          this.isChuteURL(this.modelId)
            ? {
                // For chute URLs, send model: null (Chutes API requirement)
                input: values,
                model: null,
              }
            : {
                // For management API, include model parameter
                model: this.modelId,
                input: values,
                encoding_format: 'float',
              }
        ),
      });

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.chuteId);
      }

      const data: any = await response.json();

      // Extract embeddings from response
      // OpenAI format: { data: [{ embedding: [...] }, ...], usage: { prompt_tokens: X } }
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid embedding response format');
      }

      const embeddings = data.data.map((item: any) => item.embedding);
      const usage = {
        tokens: data.usage?.prompt_tokens ?? data.usage?.total_tokens ?? 0,
      };

      return { embeddings, usage };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  private getEmbeddingUrl(modelIdOrUrl: string): string {
    // If it's a full chute URL, use it with /v1/embeddings
    if (modelIdOrUrl.startsWith('http://') || modelIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(modelIdOrUrl);
        return `${url.protocol}//${url.hostname}/v1/embeddings`;
      } catch {
        // Fall through
      }
    }
    
    // If it explicitly contains .chutes.ai, treat it as a chute hostname/slug
    if (modelIdOrUrl.includes('.chutes.ai')) {
      const slug = this.extractSlug(modelIdOrUrl);
      return `https://${slug}.chutes.ai/v1/embeddings`;
    }
    
    // Otherwise, use management API with model ID (for models like text-embedding-3-small)
    // The management API will route to the appropriate embedding chute
    return `${this.config.baseURL}/v1/embeddings`;
  }

  private isChuteURL(modelIdOrUrl: string): boolean {
    return modelIdOrUrl.includes('://') || modelIdOrUrl.includes('.chutes.ai');
  }

  private getModelName(modelIdOrUrl: string): string {
    // For chute URLs, use a generic model name since the chute itself defines the model
    // Chutes typically don't need/expect a specific model parameter when accessed via their URL
    if (this.isChuteURL(modelIdOrUrl)) {
      // Use a default model name for chute URLs
      // Some chutes might accept "default", "embeddings", or the chute's own identifier
      return 'default';
    }
    
    // For simple model IDs (like text-embedding-3-small), use as-is
    // These will be routed through the management API
    return modelIdOrUrl;
  }

  private extractModelIdentifier(modelIdOrUrl: string): string {
    // Extract the actual model name from URL or slug
    // For embedding models, common patterns:
    // - text-embedding-3-small
    // - text-embedding-3-large
    // - text-embedding-ada-002
    
    const slug = this.extractSlug(modelIdOrUrl);
    
    // If it's a simple model name without chute prefix, return as-is
    if (!slug.startsWith('chutes-')) {
      return slug;
    }
    
    // Extract model from chute slug pattern
    // Example: chutes-text-embedding-3-small -> text-embedding-3-small
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

