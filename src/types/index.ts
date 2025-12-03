/**
 * Core type definitions for Chutes.ai AI SDK provider
 */

/**
 * Configuration options for the Chutes provider
 */
export interface ChutesProviderSettings {
  /**
   * API key for Chutes.ai authentication
   * Can also be set via CHUTES_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Base URL for Chutes.ai API
   * @default 'https://api.chutes.ai/v1'
   */
  baseURL?: string;

  /**
   * Custom headers to include in API requests
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation
   */
  fetch?: typeof fetch;

  /**
   * Custom ID generator for requests
   */
  generateId?: () => string;

  /**
   * Retry configuration
   */
  retry?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };

  /**
   * Default model to use when no model ID is provided
   * Can be a chute URL, slug, or 'auto' for automatic discovery
   * Also falls back to CHUTES_DEFAULT_MODEL environment variable
   */
  defaultModel?: string;
}

/**
 * Settings for language models (chat/completion)
 */
export interface ChutesModelSettings {
  /**
   * Sampling temperature (0-2)
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * Nucleus sampling threshold
   */
  topP?: number;

  /**
   * Frequency penalty (-2 to 2)
   */
  frequencyPenalty?: number;

  /**
   * Presence penalty (-2 to 2)
   */
  presencePenalty?: number;

  /**
   * Stop sequences
   */
  stopSequences?: string[];

  /**
   * Random seed for deterministic generation
   */
  seed?: number;

  /**
   * User identifier for abuse monitoring
   */
  userId?: string;

  /**
   * Chute UUID for error tracking and warmup API integration
   * Optional. If provided, will be included in error responses for warmup calls.
   */
  chuteId?: string;

  /**
   * Provider-specific options
   */
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Settings for embedding models
 */
export interface ChutesEmbeddingSettings {
  /**
   * Dimensions for the embedding vectors (if supported)
   */
  dimensions?: number;

  /**
   * User identifier
   */
  userId?: string;

  /**
   * Chute UUID for error tracking and warmup API integration
   * Optional. If provided, will be included in error responses for warmup calls.
   */
  chuteId?: string;

  /**
   * Provider-specific options
   */
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Settings for image generation models
 */
export interface ChutesImageSettings {
  /**
   * Image size/resolution
   */
  size?: string;

  /**
   * Image quality
   */
  quality?: 'standard' | 'hd';

  /**
   * Image style
   */
  style?: 'vivid' | 'natural';

  /**
   * Number of images to generate
   */
  n?: number;

  /**
   * Response format
   */
  responseFormat?: 'url' | 'b64_json';

  /**
   * User identifier
   */
  userId?: string;

  /**
   * Chute UUID for error tracking and warmup API integration
   * Optional. If provided, will be included in error responses for warmup calls.
   */
  chuteId?: string;

  /**
   * Provider-specific options
   */
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Capabilities of a model
 */
export interface ModelCapabilities {
  /**
   * Supports chat-style interactions
   */
  chat: boolean;

  /**
   * Supports completion-style interactions
   */
  completion: boolean;

  /**
   * Supports tool/function calling
   */
  tools: boolean;

  /**
   * Supports vision/image inputs
   */
  vision: boolean;

  /**
   * Supports function calling (legacy)
   */
  functionCalling: boolean;

  /**
   * Supports streaming responses
   */
  streaming: boolean;

  /**
   * Supports reasoning/chain-of-thought
   */
  reasoning: boolean;

  /**
   * Maximum output tokens
   */
  maxTokens: number;

  /**
   * Context window size
   */
  contextWindow: number;

  /**
   * Supported input modalities
   */
  inputModalities: string[];

  /**
   * Supported output modalities
   */
  outputModalities: string[];

  /**
   * Pricing information (optional)
   */
  pricing?: {
    inputPer1M: number;
    outputPer1M: number;
    reasoningPer1M?: number;
  };
}

/**
 * Type for model ID strings
 */
export type ChutesModelId = string;

/**
 * Provider interface export placeholder
 */
export type ChutesProvider = any; // Will be properly typed when implementing the provider

/**
 * Settings for video generation models
 */
export interface ChutesVideoSettings {
  resolution?: string;
  fps?: number;
  steps?: number;
  frames?: number;
  seed?: number;
  outputFormat?: 'base64' | 'buffer';
  userId?: string;
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Settings for audio models (TTS, STT, Music)
 */
export interface ChutesAudioSettings {
  voice?: string;
  speed?: number;
  language?: string;
  duration?: number;
  outputFormat?: 'base64' | 'buffer';
  userId?: string;
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Settings for content moderation models
 */
export interface ChutesModerationSettings {
  categories?: string[];
  userId?: string;
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Settings for custom inference models
 */
export interface ChutesInferenceSettings {
  webhookUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  outputFormat?: 'json' | 'raw';
  userId?: string;
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

// Re-export types for convenience
export { ChutesProviderSettings as ProviderSettings };
export { ChutesModelSettings as ModelSettings };
export { ChutesEmbeddingSettings as EmbeddingSettings };
export { ChutesImageSettings as ImageSettings };
export { ChutesVideoSettings as VideoSettings };
export { ChutesAudioSettings as AudioSettings };
export { ChutesModerationSettings as ModerationSettings };
export { ChutesInferenceSettings as InferenceSettings };

