import type { ModelCapabilities } from '../types';

export interface ChutesModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

export interface ChuteInfo {
  chute_id: string;
  name: string;
  tagline?: string;
  slug: string;
  standard_template?: string;
  user?: {
    username: string;
  };
  public: boolean;
}

export interface ChutesListResponse {
  total: number;
  page: number;
  limit: number;
  items: ChuteInfo[];
  cord_refs: Record<string, any>;
}

/**
 * Chutes.ai Model Registry
 * 
 * Manages dynamic discovery and capabilities of open-source AI models
 * hosted on Chutes.ai. Models are NOT hardcoded - they are discovered
 * via the Chutes API at https://api.chutes.ai/chutes/
 * 
 * Architecture:
 * - Each "chute" is a deployed model instance with its own subdomain
 * - Format: https://{slug}.chutes.ai
 * - Examples: https://chutes-deepseek-v3.chutes.ai, https://chutes-llama-3-1.chutes.ai
 * 
 * All models on Chutes.ai are open-source. No proprietary models (GPT, Claude, Gemini).
 */
export class ChutesModelRegistry {
  private config: ChutesModelConfig;
  private cachedChutes: Map<string, ChuteInfo> = new Map();

  constructor(config: ChutesModelConfig) {
    this.config = config;
  }

  /**
   * Extract the slug from a chute URL
   * @param chuteUrl - Full chute URL or just the slug
   * @returns The slug (subdomain) of the chute
   */
  extractSlug(chuteUrl: string): string {
    // If it's already just a slug, return it
    if (!chuteUrl.includes('://') && !chuteUrl.includes('.')) {
      return chuteUrl;
    }

    // Extract from URL: https://chutes-deepseek-v3.chutes.ai/v1/chat/completions
    // -> chutes-deepseek-v3
    try {
      const url = new URL(chuteUrl.startsWith('http') ? chuteUrl : `https://${chuteUrl}`);
      const hostname = url.hostname;
      
      // Remove .chutes.ai suffix
      if (hostname.endsWith('.chutes.ai')) {
        return hostname.replace('.chutes.ai', '');
      }
      
      return hostname;
    } catch {
      // If URL parsing fails, try simple string extraction
      const match = chuteUrl.match(/([a-z0-9-]+)\.chutes\.ai/i);
      return match ? match[1] : chuteUrl;
    }
  }

  /**
   * Fetch available chutes from the Chutes.ai API
   * @param includePublic - Include public chutes (default: true)
   * @param limit - Maximum number of chutes to fetch (default: 100)
   * @returns List of available chutes
   */
  async fetchAvailableChutes(includePublic = true, limit = 100): Promise<ChuteInfo[]> {
    try {
      const queryParams = new URLSearchParams({
        include_public: String(includePublic),
        limit: String(limit),
      });

      const response = await (this.config.fetch ?? fetch)(
        `${this.config.baseURL}/chutes/?${queryParams}`,
        {
          headers: this.config.headers(),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch chutes: HTTP ${response.status}`);
        return [];
      }

      const data = await response.json() as ChutesListResponse;
      
      // Cache the chutes
      if (data.items) {
        for (const chute of data.items) {
          this.cachedChutes.set(chute.slug, chute);
        }
      }

      return data.items || [];
    } catch (error) {
      console.error('Error fetching chutes from API:', error);
      return [];
    }
  }

  /**
   * Get all available model identifiers (chute URLs)
   * @returns Array of chute URLs
   */
  getAllModels(): string[] {
    // Return cached chute URLs
    return Array.from(this.cachedChutes.values()).map(
      chute => `https://${chute.slug}.chutes.ai`
    );
  }

  /**
   * Infer model capabilities from chute URL or slug
   * 
   * Uses naming patterns to infer capabilities for open-source models:
   * - LLM models (DeepSeek, Llama, Qwen, Mistral, etc.)
   * - Image generation models (Flux, Stable Diffusion, etc.)
   * - Embedding models
   */
  getCapabilities(chuteUrlOrSlug: string): ModelCapabilities {
    const slug = this.extractSlug(chuteUrlOrSlug);
    const lowerSlug = slug.toLowerCase();

    // Check cached chute info for template type
    const cachedChute = this.cachedChutes.get(slug);
    
    // Default capabilities for LLM chutes
    const defaultCapabilities: ModelCapabilities = {
      chat: true,
      completion: false,
      tools: false,
      vision: false,
      functionCalling: false,
      streaming: true,
      reasoning: false,
      maxTokens: 4096,
      contextWindow: 8192,
      inputModalities: ['text'],
      outputModalities: ['text'],
    };

    // Infer from template type if available
    if (cachedChute?.standard_template) {
      const template = cachedChute.standard_template.toLowerCase();
      
      if (template === 'vllm') {
        // vLLM template = language model
        defaultCapabilities.chat = true;
        defaultCapabilities.streaming = true;
      } else if (template.includes('diffusion') || template.includes('image')) {
        // Image generation
        defaultCapabilities.chat = false;
        defaultCapabilities.outputModalities = ['image'];
      } else if (template.includes('tei') || template.includes('embedding')) {
        // Embedding model
        defaultCapabilities.chat = false;
        defaultCapabilities.outputModalities = ['embedding'];
      }
    }

    // Infer from slug naming patterns (common open-source models)
    
    // DeepSeek models (Chinese open-source LLM)
    if (lowerSlug.includes('deepseek')) {
      defaultCapabilities.chat = true;
      defaultCapabilities.tools = true;
      defaultCapabilities.functionCalling = true;
      defaultCapabilities.contextWindow = 64000;
      if (lowerSlug.includes('r1')) {
        defaultCapabilities.reasoning = true;
      }
    }
    
    // Meta Llama models
    if (lowerSlug.includes('llama') || lowerSlug.includes('meta')) {
      defaultCapabilities.chat = true;
      defaultCapabilities.tools = true;
      defaultCapabilities.functionCalling = true;
      defaultCapabilities.contextWindow = 128000;
      
      if (lowerSlug.includes('vision') || lowerSlug.includes('vl-')) {
        defaultCapabilities.vision = true;
        defaultCapabilities.inputModalities = ['text', 'image'];
      }
    }
    
    // Qwen models (Alibaba open-source)
    if (lowerSlug.includes('qwen')) {
      defaultCapabilities.chat = true;
      defaultCapabilities.tools = true;
      defaultCapabilities.functionCalling = true;
      defaultCapabilities.contextWindow = 32000;
      
      if (lowerSlug.includes('vl') || lowerSlug.includes('vision')) {
        defaultCapabilities.vision = true;
        defaultCapabilities.inputModalities = ['text', 'image'];
      }
    }
    
    // Mistral models
    if (lowerSlug.includes('mistral') || lowerSlug.includes('mixtral')) {
      defaultCapabilities.chat = true;
      defaultCapabilities.tools = true;
      defaultCapabilities.functionCalling = true;
      defaultCapabilities.contextWindow = 32000;
    }
    
    // Image generation models
    // Check for image-specific patterns in the slug
    const isImageModel = lowerSlug.includes('flux') || 
        lowerSlug.includes('stable-diffusion') || 
        lowerSlug.includes('sdxl') ||
        lowerSlug.includes('dall') ||
        (lowerSlug.includes('image') && !lowerSlug.includes('llm')) || // has 'image' but not 'llm'
        lowerSlug.includes('diffusion');
    
    if (isImageModel) {
      defaultCapabilities.chat = false;
      defaultCapabilities.streaming = false;
      defaultCapabilities.outputModalities = ['image'];
    }
    
    // Embedding models
    if (lowerSlug.includes('embed') || lowerSlug.includes('bge-') || lowerSlug.includes('e5-')) {
      defaultCapabilities.chat = false;
      defaultCapabilities.streaming = false;
      defaultCapabilities.outputModalities = ['embedding'];
    }

    return defaultCapabilities;
  }

  /**
   * Check if a chute is available
   * @param chuteUrlOrSlug - Chute URL or slug
   * @returns True if the chute is cached/known
   */
  isModelAvailable(chuteUrlOrSlug: string): boolean {
    const slug = this.extractSlug(chuteUrlOrSlug);
    return this.cachedChutes.has(slug);
  }

  /**
   * Get chutes by capability
   * @param capability - The capability to filter by
   * @returns Array of chute URLs that have the capability
   */
  getModelsByCapability(capability: keyof ModelCapabilities): string[] {
    const results: string[] = [];

    for (const chuteUrl of this.getAllModels()) {
      const capabilities = this.getCapabilities(chuteUrl);
      if (capabilities[capability]) {
        results.push(chuteUrl);
      }
    }

    return results;
  }

  /**
   * Filter chutes by template type
   * @param template - Template type (e.g., 'vllm', 'diffusion', 'tei')
   * @returns Array of matching chutes
   */
  getChutesByTemplate(template: string): ChuteInfo[] {
    return Array.from(this.cachedChutes.values()).filter(
      chute => chute.standard_template?.toLowerCase() === template.toLowerCase()
    );
  }

  /**
   * Get LLM chutes (language models)
   * @returns Array of LLM chutes
   */
  getLLMChutes(): ChuteInfo[] {
    return Array.from(this.cachedChutes.values()).filter(chute => {
      const template = chute.standard_template?.toLowerCase();
      const name = chute.name?.toLowerCase() || '';
      const slug = chute.slug?.toLowerCase() || '';
      
      return (
        template === 'vllm' ||
        name.includes('deepseek') ||
        name.includes('llama') ||
        name.includes('qwen') ||
        name.includes('mistral') ||
        slug.includes('llm')
      );
    });
  }

  /**
   * Get image generation chutes
   * @returns Array of image generation chutes
   */
  getImageChutes(): ChuteInfo[] {
    return Array.from(this.cachedChutes.values()).filter(chute => {
      const template = chute.standard_template?.toLowerCase();
      const name = chute.name?.toLowerCase() || '';
      
      return (
        template?.includes('diffusion') ||
        name.includes('flux') ||
        name.includes('stable diffusion') ||
        name.includes('sdxl')
      );
    });
  }

  /**
   * Get embedding chutes
   * @returns Array of embedding chutes
   */
  getEmbeddingChutes(): ChuteInfo[] {
    return Array.from(this.cachedChutes.values()).filter(chute => {
      const template = chute.standard_template?.toLowerCase();
      const name = chute.name?.toLowerCase() || '';
      
      return (
        template?.includes('tei') ||
        template?.includes('embedding') ||
        name.includes('embed')
      );
    });
  }
}
