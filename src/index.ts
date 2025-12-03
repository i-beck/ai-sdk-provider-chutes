/**
 * Chutes.ai Provider for Vercel AI SDK
 * 
 * @example
 * ```typescript
 * import { createChutes, chutes } from '@chutes-ai/ai-sdk-provider';
 * 
 * // Use default instance
 * const model = chutes('openai/gpt-4');
 * 
 * // Or create custom instance
 * const provider = createChutes({ apiKey: 'your-key' });
 * const model = provider('openai/gpt-4');
 * ```
 */

// Main exports
export { createChutes, chutes } from './chutes-provider';
export type { ChutesProvider } from './chutes-provider';

// Type exports
export type {
  ChutesProviderSettings,
  ChutesModelSettings,
  ChutesEmbeddingSettings,
  ChutesImageSettings,
  ChutesVideoSettings,
  ChutesAudioSettings,
  ChutesModerationSettings,
  ChutesInferenceSettings,
  ModelCapabilities,
  ChutesModelId,
} from './types';

// Model exports
export { ChutesLanguageModel } from './models/language-model';
export { ChutesEmbeddingModel } from './models/embedding-model';
export { ChutesImageModel } from './models/image-model';
export { VideoModel } from './models/video-model';
export { AudioModel } from './models/audio-model';
export { ModerationModel } from './models/moderation-model';
export { InferenceModel } from './models/inference-model';

// Video model types
export type {
  TextToVideoOptions,
  ImageToVideoOptions,
  VideoGenerationResult,
} from './models/video-model';

// Audio model types
export type {
  TextToSpeechOptions,
  SpeechToTextOptions,
  MusicGenerationOptions,
  AudioGenerationResult,
  TranscriptionResult,
} from './models/audio-model';

// Moderation model types
export type {
  ContentModerationOptions,
  ModerationResult,
  ModerationCategoryResult,
} from './models/moderation-model';

// Inference model types
export type {
  PredictOptions,
  BatchOptions,
  StatusOptions,
  InferenceResult,
  BatchInferenceResult,
  JobStatus,
} from './models/inference-model';

// Voice constants
export { VOICES, listAvailableVoices, getVoicesByLanguage, getVoicesByRegion, isValidVoice, getVoice } from './constants/voices';
export type { Voice } from './constants/voices';

// Utility exports
export { ChutesModelRegistry } from './registry/models';
export { ChutesError, ChutesAPIError, ChutesErrorHandler } from './api/errors';
export type { ChuteInfo } from './utils/chute-discovery';

// Therm utilities (warmup and monitoring)
export { warmUpChute, createThermInterface, createThermalMonitor } from './utils/therm';
export type { 
  WarmupOptions, 
  WarmupResult, 
  ThermInterface, 
  ChuteStatus,
  ThermalMonitor,
  MonitorOptions,
} from './utils/therm';

// Version
export { VERSION } from './version';

