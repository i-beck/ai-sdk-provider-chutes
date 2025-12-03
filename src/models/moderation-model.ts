import { ChutesErrorHandler } from '../api/errors';

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
 * Options for content moderation
 */
export interface ContentModerationOptions {
  content: string;
  categories?: string[];
}

/**
 * Moderation result for a single category
 */
export interface ModerationCategoryResult {
  category: string;
  flagged: boolean;
  score: number;
}

/**
 * Content moderation result
 */
export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategoryResult[];
  warnings?: any[];
}

export interface ChutesModerationModelConfig {
  provider: string;
  baseURL: string;
  chuteId: string;
  apiKey: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

/**
 * Chutes.ai Content Moderation Model
 * Analyzes content for moderation purposes
 */
export class ModerationModel {
  readonly provider: string;
  readonly modelId: string;

  private readonly settings: ChutesModerationSettings;
  private readonly config: ChutesModerationModelConfig;
  private readonly errorHandler: ChutesErrorHandler;

  constructor(config: {
    chuteId: string;
    baseURL: string;
    apiKey: string;
    categories?: string[];
    headers?: () => Record<string, string>;
    fetch?: typeof fetch;
  }) {
    this.provider = 'chutes';
    this.modelId = config.chuteId;

    this.settings = {
      categories: config.categories,
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
   * Analyze content for moderation
   */
  async analyzeContent(options: ContentModerationOptions): Promise<ModerationResult> {
    const {
      content,
      categories = this.settings.categories,
    } = options;

    const warnings: any[] = [];

    // Get moderation endpoint
    const moderationUrl = this.getModerationUrl(this.config.chuteId);

    // Build request body
    const body: Record<string, any> = {
      content,
    };

    // Add categories if specified
    if (categories && categories.length > 0) {
      body.categories = categories;
    }

    try {
      const response = await (this.config.fetch ?? fetch)(moderationUrl, {
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

      // Parse moderation response
      const data = await response.json() as any;

      // Handle different response formats from various moderation APIs
      // Format 1: OpenAI-style with results array
      if (data.results && Array.isArray(data.results)) {
        const result = data.results[0];
        const categoryResults: ModerationCategoryResult[] = [];
        
        // Extract categories from the result
        const categories = result.categories || {};
        const categoryScores = result.category_scores || {};
        
        for (const [category, flagged] of Object.entries(categories)) {
          categoryResults.push({
            category,
            flagged: Boolean(flagged),
            score: categoryScores[category] || 0,
          });
        }

        return {
          flagged: result.flagged || false,
          categories: categoryResults,
          warnings,
        };
      }

      // Format 2: Simple format with direct categories object
      if (data.categories) {
        const categoryResults: ModerationCategoryResult[] = [];
        
        for (const [category, result] of Object.entries(data.categories)) {
          const categoryData = result as any;
          categoryResults.push({
            category,
            flagged: Boolean(categoryData.flagged || categoryData.detected),
            score: categoryData.score || categoryData.confidence || 0,
          });
        }

        return {
          flagged: data.flagged || categoryResults.some(c => c.flagged),
          categories: categoryResults,
          warnings,
        };
      }

      // Format 3: Direct flagged/score format
      return {
        flagged: Boolean(data.flagged),
        categories: data.category_scores ? Object.entries(data.category_scores).map(([category, score]) => ({
          category,
          flagged: (score as number) > 0.5, // Default threshold
          score: score as number,
        })) : [],
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  /**
   * Get moderation URL for the chute
   */
  private getModerationUrl(chuteIdOrUrl: string): string {
    // If it's a full URL, use /v1/moderations endpoint
    if (chuteIdOrUrl.startsWith('http://') || chuteIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(chuteIdOrUrl);
        return `${url.protocol}//${url.hostname}/v1/moderations`;
      } catch {
        // Fall through
      }
    }

    // Construct chute URL with /v1/moderations endpoint
    return `https://${chuteIdOrUrl}.chutes.ai/v1/moderations`;
  }
}

