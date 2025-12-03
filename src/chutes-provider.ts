import type {
  LanguageModelV2,
  EmbeddingModelV2,
  ImageModelV2,
} from '@ai-sdk/provider';
import {
  generateId,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { ChutesLanguageModel } from './models/language-model';
import { ChutesEmbeddingModel } from './models/embedding-model';
import { ChutesImageModel } from './models/image-model';
import { VideoModel } from './models/video-model';
import { AudioModel } from './models/audio-model';
import { ModerationModel } from './models/moderation-model';
import { InferenceModel } from './models/inference-model';
import type {
  ChutesProviderSettings,
  ChutesModelSettings,
  ChutesEmbeddingSettings,
  ChutesImageSettings,
  ChutesVideoSettings,
  ChutesAudioSettings,
  ChutesModerationSettings,
  ChutesInferenceSettings,
  ModelCapabilities,
} from './types';
import { VERSION } from './version';
import { discoverChutes, filterChutesByType, getChuteUrl, type ChuteInfo } from './utils/chute-discovery';
import { ChutesModelRegistry } from './registry/models';
import { createThermInterface, type ThermInterface } from './utils/therm';

export interface ChutesProvider {
  // Main model accessor (OpenRouter-style) - modelId is now optional for lazy defaults
  (modelId?: string, settings?: ChutesModelSettings): LanguageModelV2 | Promise<LanguageModelV2>;

  // Specific model types with full type safety
  chat(modelId: string, settings?: ChutesModelSettings): LanguageModelV2;
  completion(modelId: string, settings?: ChutesModelSettings): LanguageModelV2;
  languageModel(modelId: string, settings?: ChutesModelSettings): LanguageModelV2;
  textEmbeddingModel(modelId: string, settings?: ChutesEmbeddingSettings): EmbeddingModelV2<string>;
  imageModel(modelId: string, settings?: ChutesImageSettings): ImageModelV2;
  videoModel(modelId: string, settings?: ChutesVideoSettings): VideoModel;
  audioModel(modelId: string, settings?: ChutesAudioSettings): AudioModel;
  moderationModel(modelId: string, settings?: ChutesModerationSettings): ModerationModel;
  inferenceModel(modelId: string, settings?: ChutesInferenceSettings): InferenceModel;

  /**
   * List all available chutes/models
   * @param type - Optional filter by type (llm, image, embedding, video, tts, stt, music)
   * @returns Promise resolving to array of chute information
   */
  listModels(type?: string): Promise<ChuteInfo[]>;
  
  /**
   * Get capabilities for a specific model
   * @param modelId - Chute URL, slug, or chute_id
   * @returns Promise resolving to model capabilities
   */
  getModelCapabilities(modelId: string): Promise<ModelCapabilities>;

  /**
   * Therm utilities for warming up chutes
   * Named after thermals that gliders/parachutes use to gain altitude
   */
  therm: ThermInterface;
}

export function createChutes(options: ChutesProviderSettings = {}): ChutesProvider {
  const apiKey = loadApiKey({
    apiKey: options.apiKey,
    environmentVariableName: 'CHUTES_API_KEY',
    description: 'Chutes.ai',
  });

  const baseURL = withoutTrailingSlash(options.baseURL ?? 'https://api.chutes.ai') ?? 'https://api.chutes.ai';
  
  const baseConfig = {
    provider: 'chutes' as const,
    baseURL,
    headers: () => ({
      'Authorization': `Bearer ${apiKey}`,
      'X-Provider': 'chutes-ai-sdk',
      'X-Provider-Version': VERSION,
      'User-Agent': `chutes-ai-sdk/${VERSION}`,
      ...options.headers,
    }),
    fetch: options.fetch,
  };

  // Create language model factory
  const createLanguageModel = (
    modelId: string,
    settings: ChutesModelSettings = {}
  ): LanguageModelV2 => {
    return new ChutesLanguageModel(modelId, settings, {
      ...baseConfig,
      chuteId: settings.chuteId, // Pass chute ID from settings if provided
    });
  };

  // Create embedding model factory
  const createEmbeddingModel = (
    modelId: string,
    settings: ChutesEmbeddingSettings = {}
  ): EmbeddingModelV2<string> => {
    return new ChutesEmbeddingModel(modelId, settings, {
      ...baseConfig,
      chuteId: settings.chuteId, // Pass chute ID from settings if provided
    });
  };

  // Create image model factory
  const createImageModel = (
    modelId: string,
    settings: ChutesImageSettings = {}
  ): ImageModelV2 => {
    return new ChutesImageModel(modelId, settings, {
      ...baseConfig,
      chuteId: settings.chuteId, // Pass chute ID from settings if provided
    });
  };

  // Create video model factory
  const createVideoModel = (
    modelId: string,
    settings: ChutesVideoSettings = {}
  ): VideoModel => {
    return new VideoModel({
      chuteId: modelId,
      baseURL,
      apiKey,
      ...settings,
      headers: baseConfig.headers,
      fetch: baseConfig.fetch,
    });
  };

  // Create audio model factory
  const createAudioModel = (
    modelId: string,
    settings: ChutesAudioSettings = {}
  ): AudioModel => {
    return new AudioModel({
      chuteId: modelId,
      baseURL,
      apiKey,
      ...settings,
      headers: baseConfig.headers,
      fetch: baseConfig.fetch,
    });
  };

  // Create moderation model factory
  const createModerationModel = (
    modelId: string,
    settings: ChutesModerationSettings = {}
  ): ModerationModel => {
    return new ModerationModel({
      chuteId: modelId,
      baseURL,
      apiKey,
      ...settings,
      headers: baseConfig.headers,
      fetch: baseConfig.fetch,
    });
  };

  // Create inference model factory
  const createInferenceModel = (
    modelId: string,
    settings: ChutesInferenceSettings = {}
  ): InferenceModel => {
    return new InferenceModel({
      chuteId: modelId,
      baseURL,
      apiKey,
      ...settings,
      headers: baseConfig.headers,
      fetch: baseConfig.fetch,
    });
  };

  // Implement listModels() method
  const listModels = async (type?: string): Promise<ChuteInfo[]> => {
    // Always fetch fresh data (no caching)
    const allChutes = await discoverChutes(apiKey);
    
    // If type filter provided, apply it
    if (type) {
      return filterChutesByType(allChutes, type);
    }
    
    return allChutes;
  };

  // Implement getModelCapabilities() method
  const getModelCapabilities = async (modelId: string): Promise<ModelCapabilities> => {
    // First, try to find the chute in the list
    const allChutes = await discoverChutes(apiKey);
    
    // Extract slug from modelId (could be URL, slug, or chute_id)
    const registry = new ChutesModelRegistry(baseConfig);
    let slug = modelId;
    
    // If it's a URL, extract the slug
    if (modelId.includes('://') || modelId.includes('.')) {
      slug = registry.extractSlug(modelId);
    }
    
    // If it's a chute_id (UUID format), find the matching chute
    if (modelId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const chute = allChutes.find(c => c.chute_id === modelId);
      if (chute) {
        slug = chute.slug;
      }
    }
    
    // Use registry to get capabilities (it infers from slug/template)
    // But we need to populate its cache first
    await registry.fetchAvailableChutes();
    return registry.getCapabilities(slug);
  };

  // Helper to get or discover default model
  const getOrDiscoverDefault = async (): Promise<string> => {
    // Priority: 1. Option, 2. Env var, 3. Lazy discovery
    
    // Check option first
    if (options.defaultModel) {
      return options.defaultModel;
    }
    
    // Check env var
    if (process.env.CHUTES_DEFAULT_MODEL) {
      return process.env.CHUTES_DEFAULT_MODEL;
    }
    
    // Lazy discovery - warn user
    console.warn(
      '⚠️  CHUTES_DEFAULT_MODEL not set. Discovering first available LLM chute...\n' +
      '   To avoid discovery delays, set: process.env.CHUTES_DEFAULT_MODEL = "your-chute-url"'
    );
    
    // Discover first LLM chute
    const allChutes = await discoverChutes(apiKey);
    const llmChutes = filterChutesByType(allChutes, 'llm');
    
    if (llmChutes.length === 0) {
      throw new Error('No LLM chutes available. Please specify a model explicitly or ensure you have access to LLM chutes.');
    }
    
    // Use first available LLM
    const defaultChute = getChuteUrl(llmChutes[0].slug);
    console.warn(`   ✓ Discovered default: ${llmChutes[0].name} (${defaultChute})`);
    
    // Store in env var for this session
    process.env.CHUTES_DEFAULT_MODEL = defaultChute;
    
    return defaultChute;
  };

  // Main provider function - now supports optional modelId
  const provider = function (modelId?: string, settings?: ChutesModelSettings) {
    if (new.target) {
      throw new Error(
        'The model factory function cannot be called with the new keyword.'
      );
    }
    
    // If modelId provided, use it directly
    if (modelId) {
      return createLanguageModel(modelId, settings);
    }
    
    // No modelId - need to discover default (async operation)
    // Return a promise that resolves to the model
    return getOrDiscoverDefault().then(defaultId => 
      createLanguageModel(defaultId, settings)
    );
  } as ChutesProvider;

  // Create therm interface
  const therm = createThermInterface(apiKey, baseURL, options.fetch, options.headers);

  // Attach methods to provider
  provider.chat = createLanguageModel;
  provider.completion = createLanguageModel;
  provider.languageModel = createLanguageModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.imageModel = createImageModel;
  provider.videoModel = createVideoModel;
  provider.audioModel = createAudioModel;
  provider.moderationModel = createModerationModel;
  provider.inferenceModel = createInferenceModel;
  provider.listModels = listModels;
  provider.getModelCapabilities = getModelCapabilities;
  provider.therm = therm;

  return provider;
}

// Default instance (lazy-loaded to avoid requiring API key at import time)
let defaultInstance: ChutesProvider | undefined;

function getDefaultInstance(): ChutesProvider {
  if (!defaultInstance) {
    defaultInstance = createChutes();
  }
  return defaultInstance;
}

export const chutes = new Proxy(function() {} as any, {
  get(target, prop) {
    return getDefaultInstance()[prop as keyof ChutesProvider];
  },
  apply(target, thisArg, args: [string?, ChutesModelSettings?]) {
    return getDefaultInstance()(args[0], args[1]);
  },
}) as ChutesProvider;

