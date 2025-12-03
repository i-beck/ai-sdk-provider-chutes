import { ChutesErrorHandler } from '../api/errors';

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

/**
 * Options for single inference prediction
 */
export interface PredictOptions {
  modelId: string;
  input: Record<string, any>;
  webhookUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  outputFormat?: 'json' | 'raw';
}

/**
 * Options for batch inference
 */
export interface BatchOptions {
  modelId: string;
  inputs: Array<Record<string, any>>;
  webhookUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  outputFormat?: 'json' | 'raw';
}

/**
 * Options for checking job status
 */
export interface StatusOptions {
  jobId: string;
}

/**
 * Inference prediction result
 */
export interface InferenceResult {
  output: any;
  jobId?: string;
  status?: string;
  warnings?: any[];
}

/**
 * Batch inference result
 */
export interface BatchInferenceResult {
  outputs?: any[];
  jobId?: string;
  status?: string;
  warnings?: any[];
}

/**
 * Job status result
 */
export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface ChutesInferenceModelConfig {
  provider: string;
  baseURL: string;
  chuteId: string;
  apiKey: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Chutes.ai Custom Inference Model
 * Supports predict, batch, and status operations
 */
export class InferenceModel {
  readonly provider: string;
  readonly modelId: string;

  private readonly settings: ChutesInferenceSettings;
  private readonly config: ChutesInferenceModelConfig;
  private readonly errorHandler: ChutesErrorHandler;

  constructor(config: {
    chuteId: string;
    baseURL: string;
    apiKey: string;
    webhookUrl?: string;
    priority?: 'low' | 'normal' | 'high';
    outputFormat?: 'json' | 'raw';
    headers?: () => Record<string, string>;
    fetch?: typeof fetch;
  }) {
    this.provider = 'chutes';
    this.modelId = config.chuteId;

    this.settings = {
      webhookUrl: config.webhookUrl,
      priority: config.priority || 'normal',
      outputFormat: config.outputFormat || 'json',
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
   * Run single inference prediction
   */
  async predict(options: PredictOptions): Promise<InferenceResult> {
    const {
      modelId,
      input,
      webhookUrl = this.settings.webhookUrl,
      priority = this.settings.priority,
      outputFormat = this.settings.outputFormat,
    } = options;

    const warnings: any[] = [];

    // Get predict endpoint
    const predictUrl = this.getPredictUrl(modelId);

    // Build request body
    const body: Record<string, any> = {
      input,
    };

    // Add optional parameters
    if (webhookUrl) {
      body.webhook_url = webhookUrl;
    }
    if (priority) {
      body.priority = priority;
    }
    if (outputFormat) {
      body.output_format = outputFormat;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(predictUrl, {
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

      const data = await response.json() as any;

      return {
        output: data.output || data.result || data,
        jobId: data.job_id || data.jobId,
        status: data.status,
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Run batch inference
   */
  async batch(options: BatchOptions): Promise<BatchInferenceResult> {
    const {
      modelId,
      inputs,
      webhookUrl = this.settings.webhookUrl,
      priority = this.settings.priority,
      outputFormat = this.settings.outputFormat,
    } = options;

    const warnings: any[] = [];

    // Get batch endpoint
    const batchUrl = this.getBatchUrl(modelId);

    // Build request body
    const body: Record<string, any> = {
      inputs,
    };

    // Add optional parameters
    if (webhookUrl) {
      body.webhook_url = webhookUrl;
    }
    if (priority) {
      body.priority = priority;
    }
    if (outputFormat) {
      body.output_format = outputFormat;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(batchUrl, {
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

      const data = await response.json() as any;

      return {
        outputs: data.outputs || data.results,
        jobId: data.job_id || data.jobId,
        status: data.status,
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Get job status
   */
  async getStatus(options: StatusOptions): Promise<JobStatus> {
    const { jobId } = options;

    // Get status endpoint
    const statusUrl = this.getStatusUrl(jobId);

    try {
      const response = await (this.config.fetch ?? fetch)(statusUrl, {
        method: 'GET',
        headers: {
          ...this.config.headers(),
        },
      });

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.config.chuteId);
      }

      const data = await response.json() as any;

      return {
        jobId: data.job_id || data.jobId || jobId,
        status: this.normalizeStatus(data.status),
        result: data.result || data.output,
        error: data.error,
        createdAt: data.created_at || data.createdAt,
        completedAt: data.completed_at || data.completedAt,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Get predict URL
   */
  private getPredictUrl(modelId: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/v1/inference/${modelId}/predict`;
  }

  /**
   * Get batch URL
   */
  private getBatchUrl(modelId: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/v1/inference/${modelId}/batch`;
  }

  /**
   * Get status URL
   */
  private getStatusUrl(jobId: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/v1/inference/jobs/${jobId}`;
  }

  /**
   * Get base URL
   */
  private getBaseUrl(): string {
    if (this.config.chuteId.startsWith('http://') || this.config.chuteId.startsWith('https://')) {
      try {
        const url = new URL(this.config.chuteId);
        return `${url.protocol}//${url.hostname}`;
      } catch {
        // Fall through
      }
    }

    return `https://${this.config.chuteId}.chutes.ai`;
  }

  /**
   * Normalize status string to standard format
   */
  private normalizeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const normalized = status?.toLowerCase();
    
    if (normalized === 'completed' || normalized === 'success' || normalized === 'done') {
      return 'completed';
    }
    if (normalized === 'failed' || normalized === 'error') {
      return 'failed';
    }
    if (normalized === 'processing' || normalized === 'running') {
      return 'processing';
    }
    return 'pending';
  }
}

