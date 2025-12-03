import { ChutesErrorHandler } from '../api/errors';

/**
 * Settings for video generation models
 */
export interface ChutesVideoSettings {
  /**
   * Video resolution (e.g., '1024x576', '512x512')
   */
  resolution?: string;

  /**
   * Frames per second
   */
  fps?: number;

  /**
   * Number of generation steps
   */
  steps?: number;

  /**
   * Total number of frames to generate
   */
  frames?: number;

  /**
   * Random seed for deterministic generation
   */
  seed?: number;

  /**
   * Output format for binary data
   * @default 'base64' - Returns data URI string
   * 'buffer' - Returns Buffer object
   */
  outputFormat?: 'base64' | 'buffer';

  /**
   * User identifier
   */
  userId?: string;

  /**
   * Provider-specific options
   */
  providerOptions?: {
    chutes?: Record<string, unknown>;
  };
}

/**
 * Options for text-to-video generation
 */
export interface TextToVideoOptions {
  prompt: string;
  resolution?: string;
  fps?: number;
  steps?: number;
  frames?: number;
  seed?: number;
  outputFormat?: 'base64' | 'buffer';
}

/**
 * Options for image-to-video generation
 */
export interface ImageToVideoOptions {
  prompt: string;
  image: string | Buffer; // URL, base64, or Buffer
  fps?: number;
  steps?: number;
  frames?: number;
  seed?: number;
  outputFormat?: 'base64' | 'buffer';
}

/**
 * Video generation result
 */
export interface VideoGenerationResult {
  video: string | Buffer; // Base64 data URI or Buffer
  metadata?: {
    duration?: number;
    resolution?: string;
    fps?: number;
    format?: string;
  };
  warnings?: any[];
}

export interface ChutesVideoModelConfig {
  provider: string;
  baseURL: string;
  chuteId: string;
  apiKey: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Chutes.ai Video Generation Model
 * Supports text-to-video and image-to-video operations
 */
export class VideoModel {
  readonly provider: string;
  readonly modelId: string;

  private readonly settings: ChutesVideoSettings;
  private readonly config: ChutesVideoModelConfig;
  private readonly errorHandler: ChutesErrorHandler;

  constructor(config: {
    chuteId: string;
    baseURL: string;
    apiKey: string;
    resolution?: string;
    fps?: number;
    steps?: number;
    frames?: number;
    seed?: number;
    outputFormat?: 'base64' | 'buffer';
    headers?: () => Record<string, string>;
    fetch?: typeof fetch;
  }) {
    this.provider = 'chutes';
    this.modelId = config.chuteId;

    this.settings = {
      resolution: config.resolution,
      fps: config.fps,
      steps: config.steps,
      frames: config.frames,
      seed: config.seed,
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
   * Generate video from text prompt (text-to-video)
   */
  async generateVideo(options: TextToVideoOptions): Promise<VideoGenerationResult> {
    const {
      prompt,
      resolution = this.settings.resolution || '1024x576',
      fps = this.settings.fps || 24,
      steps = this.settings.steps || 30,
      frames = this.settings.frames,
      seed = this.settings.seed,
      outputFormat = this.settings.outputFormat || 'base64',
    } = options;

    return this.doGenerate({
      operation: 'text2video',
      prompt,
      resolution,
      fps,
      steps,
      frames,
      seed,
      outputFormat,
    });
  }

  /**
   * Generate video from image (image-to-video)
   */
  async animateImage(options: ImageToVideoOptions): Promise<VideoGenerationResult> {
    const {
      prompt,
      image,
      fps = this.settings.fps || 24,
      steps = this.settings.steps || 30,
      frames = this.settings.frames,
      seed = this.settings.seed,
      outputFormat = this.settings.outputFormat || 'base64',
    } = options;

    // Convert image to base64 if needed
    const imageBase64 = await this.convertImageToBase64(image);

    return this.doGenerate({
      operation: 'image2video',
      prompt,
      image_b64: imageBase64,
      fps,
      steps,
      frames,
      seed,
      outputFormat,
    });
  }

  /**
   * Core generation method using OpenAPI discovery
   */
  async doGenerate(params: {
    operation: 'text2video' | 'image2video';
    prompt: string;
    resolution?: string;
    image_b64?: string;
    fps?: number;
    steps?: number;
    frames?: number;
    seed?: number;
    outputFormat?: 'base64' | 'buffer';
  }): Promise<VideoGenerationResult> {
    const warnings: any[] = [];

    // Get video generation endpoint (operation-specific)
    const videoUrl = this.getVideoGenerationUrl(this.config.chuteId, params.operation);

    // Build request body
    const body: Record<string, any> = {
      prompt: params.prompt,
    };

    // Add operation-specific parameters
    if (params.operation === 'text2video') {
      if (params.resolution) {
        body.resolution = params.resolution;
      }
    } else if (params.operation === 'image2video') {
      if (params.image_b64) {
        body.image = params.image_b64;
      }
    }

    // Add common parameters
    if (params.fps !== undefined) body.fps = params.fps;
    if (params.steps !== undefined) body.steps = params.steps;
    if (params.frames !== undefined) body.frames = params.frames;
    if (params.seed !== undefined) body.seed = params.seed;

    try {
      const response = await (this.config.fetch ?? fetch)(videoUrl, {
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

      // Video endpoints return binary MP4 data
      const binaryData = await response.arrayBuffer();
      
      const outputFormat = params.outputFormat || 'base64';
      let videoData: string | Buffer;

      if (outputFormat === 'buffer') {
        videoData = Buffer.from(binaryData);
      } else {
        // Convert to base64 data URI
        const base64String = Buffer.from(binaryData).toString('base64');
        videoData = `data:video/mp4;base64,${base64String}`;
      }

      return {
        video: videoData,
        metadata: {
          resolution: params.resolution,
          fps: params.fps,
          format: 'mp4',
        },
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Get video generation URL for the chute
   * @param operation - The video operation type ('text2video' or 'image2video')
   */
  private getVideoGenerationUrl(chuteIdOrUrl: string, operation: 'text2video' | 'image2video'): string {
    // Determine endpoint based on operation
    // Text-to-video uses /text2video, Image-to-video uses /generate
    const endpoint = operation === 'text2video' ? '/text2video' : '/generate';
    
    // If it's a full URL, append the appropriate endpoint
    if (chuteIdOrUrl.startsWith('http://') || chuteIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(chuteIdOrUrl);
        return `${url.protocol}//${url.hostname}${endpoint}`;
      } catch {
        return `${chuteIdOrUrl}${endpoint}`;
      }
    }

    // Construct chute URL with appropriate endpoint
    return `https://${chuteIdOrUrl}.chutes.ai${endpoint}`;
  }

  /**
   * Convert image from various formats to base64
   */
  private async convertImageToBase64(image: string | Buffer): Promise<string> {
    // If already a Buffer, convert to base64
    if (Buffer.isBuffer(image)) {
      return image.toString('base64');
    }

    // If it's a data URI, extract base64 part
    if (image.startsWith('data:')) {
      const base64Match = image.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (base64Match) {
        return base64Match[1];
      }
    }

    // If it's a URL, fetch and convert
    if (image.startsWith('http://') || image.startsWith('https://')) {
      const response = await (this.config.fetch ?? fetch)(image);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    }

    // Assume it's already base64
    return image;
  }
}

