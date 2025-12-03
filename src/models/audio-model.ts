import { ChutesErrorHandler } from '../api/errors';

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
 * Options for text-to-speech generation
 */
export interface TextToSpeechOptions {
  text: string;
  voice?: string;
  speed?: number;
  outputFormat?: 'base64' | 'buffer';
}

/**
 * Options for speech-to-text transcription
 */
export interface SpeechToTextOptions {
  audio: string | Buffer; // URL, base64, or Buffer
  language?: string;
  includeChunks?: boolean;
}

/**
 * Options for music generation
 */
export interface MusicGenerationOptions {
  prompt: string;
  duration?: number;
  outputFormat?: 'base64' | 'buffer';
}

/**
 * Audio generation result
 */
export interface AudioGenerationResult {
  audio: string | Buffer; // Base64 data URI or Buffer
  metadata?: {
    duration?: number;
    format?: string;
    voice?: string;
  };
  warnings?: any[];
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  text: string;
  duration?: number;
  chunkCount?: number;
  chunks?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  warnings?: any[];
}

export interface ChutesAudioModelConfig {
  provider: string;
  baseURL: string;
  chuteId: string;
  apiKey: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Chutes.ai Audio Model
 * Supports text-to-speech, speech-to-text, and music generation
 */
export class AudioModel {
  readonly provider: string;
  readonly modelId: string;

  private readonly settings: ChutesAudioSettings;
  private readonly config: ChutesAudioModelConfig;
  private readonly errorHandler: ChutesErrorHandler;

  constructor(config: {
    chuteId: string;
    baseURL: string;
    apiKey: string;
    voice?: string;
    speed?: number;
    language?: string;
    duration?: number;
    outputFormat?: 'base64' | 'buffer';
    headers?: () => Record<string, string>;
    fetch?: typeof fetch;
  }) {
    this.provider = 'chutes';
    this.modelId = config.chuteId;

    this.settings = {
      voice: config.voice,
      speed: config.speed,
      language: config.language,
      duration: config.duration,
      outputFormat: config.outputFormat || 'base64',
    };

    this.config = {
      provider: 'chutes',
      baseURL: config.baseURL,
      chuteId: config.chuteId,
      apiKey: config.apiKey,
      headers: config.headers || (() => ({
        'Authorization': `Bearer ${config.apiKey}`,
      })),
      fetch: config.fetch,
    };

    this.errorHandler = new ChutesErrorHandler();
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(options: TextToSpeechOptions): Promise<AudioGenerationResult> {
    const {
      text,
      voice = this.settings.voice,
      speed = this.settings.speed,
      outputFormat = this.settings.outputFormat || 'base64',
    } = options;

    const warnings: any[] = [];

    // Get TTS endpoint (from n8n: /speak)
    const ttsUrl = this.getTTSUrl(this.config.chuteId);

    // Build request body
    const body: Record<string, any> = {
      text, // TTS chutes expect 'text' field
    };

    // Add voice if specified (ignore separator values from UI)
    if (voice && !voice.startsWith('_separator_')) {
      body.voice = voice;
    }

    // Add speed if specified
    if (speed !== undefined) {
      body.speed = speed;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(ttsUrl, {
        method: 'POST',
        headers: {
          ...this.config.headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.config.chuteId);
      }

      // TTS endpoints return binary audio data
      const binaryData = await response.arrayBuffer();
      
      let audioData: string | Buffer;

      if (outputFormat === 'buffer') {
        audioData = Buffer.from(binaryData);
      } else {
        // Convert to base64 data URI
        const base64String = Buffer.from(binaryData).toString('base64');
        audioData = `data:audio/mpeg;base64,${base64String}`;
      }

      return {
        audio: audioData,
        metadata: {
          format: 'mp3',
          voice,
        },
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Transcribe speech to text
   */
  async speechToText(options: SpeechToTextOptions): Promise<TranscriptionResult> {
    const {
      audio,
      language = this.settings.language || 'en',
      includeChunks = false,
    } = options;

    const warnings: any[] = [];

    // Get STT endpoint (from n8n: /transcribe)
    const sttUrl = this.getSTTUrl(this.config.chuteId);

    // Convert audio to base64
    const audioBase64 = await this.convertAudioToBase64(audio);

    // Build request body (API expects 'audio_b64' field)
    const body: Record<string, any> = {
      audio_b64: audioBase64,
    };

    // Add language if specified
    if (language) {
      body.language = language;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(sttUrl, {
        method: 'POST',
        headers: {
          ...this.config.headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.config.chuteId);
      }

      // Response is an array of chunks with timestamps
      // Format: [{ start: 0, end: 1.5, text: "..." }, ...]
      const chunks = await response.json() as Array<{ start: number; end: number; text: string }>;

      // Combine all chunks into continuous text
      const fullText = chunks.map(chunk => chunk.text || '').join('').trim();

      const result: TranscriptionResult = {
        text: fullText,
        duration: chunks.length > 0 ? chunks[chunks.length - 1].end : 0,
        chunkCount: chunks.length,
        warnings,
      };

      // Include chunks if requested
      if (includeChunks) {
        result.chunks = chunks;
      }

      return result;
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Generate music from text prompt
   */
  async generateMusic(options: MusicGenerationOptions): Promise<AudioGenerationResult> {
    const {
      prompt,
      duration = this.settings.duration || 30,
      outputFormat = this.settings.outputFormat || 'base64',
    } = options;

    const warnings: any[] = [];

    // Get music generation endpoint (same as image/video: /generate)
    const musicUrl = this.getMusicUrl(this.config.chuteId);

    // Build request body
    const body: Record<string, any> = {
      prompt,
    };

    // Add duration if specified
    if (duration !== undefined) {
      body.duration = duration;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(musicUrl, {
        method: 'POST',
        headers: {
          ...this.config.headers(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.config.chuteId);
      }

      // Music endpoints return binary audio data
      const binaryData = await response.arrayBuffer();
      
      let audioData: string | Buffer;

      if (outputFormat === 'buffer') {
        audioData = Buffer.from(binaryData);
      } else {
        // Convert to base64 data URI
        const base64String = Buffer.from(binaryData).toString('base64');
        audioData = `data:audio/mpeg;base64,${base64String}`;
      }

      return {
        audio: audioData,
        metadata: {
          duration,
          format: 'mp3',
        },
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Get TTS URL for the chute
   */
  private getTTSUrl(chuteIdOrUrl: string): string {
    // If it's a full URL, use /speak endpoint
    if (chuteIdOrUrl.startsWith('http://') || chuteIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(chuteIdOrUrl);
        return `${url.protocol}//${url.hostname}/speak`;
      } catch {
        // Fall through
      }
    }

    // Construct chute URL with /speak endpoint
    return `https://${chuteIdOrUrl}.chutes.ai/speak`;
  }

  /**
   * Get STT URL for the chute
   */
  private getSTTUrl(chuteIdOrUrl: string): string {
    // If it's a full URL, use /transcribe endpoint
    if (chuteIdOrUrl.startsWith('http://') || chuteIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(chuteIdOrUrl);
        return `${url.protocol}//${url.hostname}/transcribe`;
      } catch {
        // Fall through
      }
    }

    // Construct chute URL with /transcribe endpoint
    return `https://${chuteIdOrUrl}.chutes.ai/transcribe`;
  }

  /**
   * Get music generation URL for the chute
   */
  private getMusicUrl(chuteIdOrUrl: string): string {
    // If it's a full URL, use /generate endpoint
    if (chuteIdOrUrl.startsWith('http://') || chuteIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(chuteIdOrUrl);
        return `${url.protocol}//${url.hostname}/generate`;
      } catch {
        // Fall through
      }
    }

    // Construct chute URL with /generate endpoint
    return `https://${chuteIdOrUrl}.chutes.ai/generate`;
  }

  /**
   * Convert audio from various formats to base64
   */
  private async convertAudioToBase64(audio: string | Buffer): Promise<string> {
    // If already a Buffer, convert to base64
    if (Buffer.isBuffer(audio)) {
      return audio.toString('base64');
    }

    // If it's a data URI, extract base64 part
    if (audio.startsWith('data:')) {
      const base64Match = audio.match(/^data:audio\/[a-z0-9]+;base64,(.+)$/);
      if (base64Match) {
        return base64Match[1];
      }
    }

    // If it's a URL, fetch and convert
    if (audio.startsWith('http://') || audio.startsWith('https://')) {
      const response = await (this.config.fetch ?? fetch)(audio);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    }

    // Assume it's already base64
    return audio;
  }
}


