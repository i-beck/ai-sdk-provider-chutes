import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2FinishReason,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { ChutesMessageConverter } from '../converters/messages';
import { ChutesErrorHandler } from '../api/errors';
import type { ChutesModelSettings } from '../types';

export interface ChutesLanguageModelConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
  chuteId?: string; // Optional chute UUID for error tracking
}

export class ChutesLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode = 'json' as const;
  
  // V2 requires supportedUrls
  get supportedUrls() {
    return {
      'image/*': [
        /^https:\/\/cdn\.chutes\.ai\/.*/,
        /^https:\/\/storage\.googleapis\.com\/.*/,
        /^https:\/\/.*\.amazonaws\.com\/.*/,
      ],
    };
  }

  private readonly settings: ChutesModelSettings;
  private readonly config: ChutesLanguageModelConfig;
  private readonly messageConverter: ChutesMessageConverter;
  private readonly errorHandler: ChutesErrorHandler;
  private readonly chuteId?: string; // Store chute UUID for error tracking

  constructor(
    modelId: string,
    settings: ChutesModelSettings,
    config: ChutesLanguageModelConfig
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.chuteId = config.chuteId; // Capture chute ID if provided
    this.messageConverter = new ChutesMessageConverter(config);
    this.errorHandler = new ChutesErrorHandler();
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    // Convert messages
    const messages = this.messageConverter.convert(options.prompt);

    // Determine the chute URL
    // modelId can be either a full chute URL (https://chutes-deepseek-v3.chutes.ai) or just a slug
    const chuteUrl = this.getChuteUrl(this.modelId);
    
    // Extract any model identifier from the slug for the request body (optional)
    // For most chutes, the model is implicit in the chute itself
    const modelForRequest = this.extractModelIdentifier(this.modelId);

    // Build request body
    const body: Record<string, any> = {
      messages,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens ?? this.settings.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: false,
      seed: options.seed,
    };
    
    // Only include model if we extracted one (some chutes auto-select)
    if (modelForRequest) {
      body.model = modelForRequest;
    }

    // Add tools if provided (V2 interface)
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      // Add tool_choice if specified
      if (options.toolChoice) {
        if (options.toolChoice.type === 'required') {
          body.tool_choice = 'required';
        } else if (options.toolChoice.type === 'tool') {
          body.tool_choice = {
            type: 'function',
            function: { name: options.toolChoice.toolName },
          };
        } else if (options.toolChoice.type === 'auto' || options.toolChoice.type === 'none') {
          body.tool_choice = options.toolChoice.type;
        }
      }
    }

    try {
      const response = await (this.config.fetch ?? fetch)(
        `${chuteUrl}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            ...this.config.headers(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: options.abortSignal,
        }
      );

      if (!response.ok) {
        throw await this.errorHandler.createAPIError(response, this.chuteId);
      }

      const data: any = await response.json();

      // Extract response
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error('No choices in response');
      }

      const message = choice.message;
      
      // Build V2 response with separate text and toolCalls
      let text: string | undefined;
      const toolCalls: any[] = [];
      const contentParts: any[] = [];
      
      // Extract text content
      if (message.content) {
        text = message.content;
        contentParts.push({
          type: 'text',
          text: message.content,
        });
      }
      
      // Extract tool calls
      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          const toolCall = {
            toolCallType: 'function' as const,
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          };
          
          toolCalls.push(toolCall);
          contentParts.push({
            type: 'tool-call',
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: tc.function.arguments, // V2 spec requires stringified JSON, not parsed args
          });
        }
      } else if (message.content && typeof message.content === 'string' && message.content.includes('function<｜tool▁sep｜>')) {
        // Parse custom tool call format embedded in content
        // This format may or may not have wrapper markers like <｜tool▁calls▁begin｜>
        // Format examples:
        // - With markers: <｜tool▁calls▁begin｜>function<｜tool▁sep｜>name\n```json\n{...}\n```<｜tool▁call▁end｜>
        // - Without markers (multiple): function<｜tool▁sep｜>name1\n```json\n{...}\n```<｜tool▁call▁end｜>\n<｜tool▁call▁begin｜>function<｜tool▁sep｜>name2\n```json\n{...}\n```
        
        // Match all tool calls in the content - look for the function<｜tool▁sep｜> pattern
        const toolMatches = message.content.matchAll(/function<｜tool▁sep｜>(\w+)\n```json\n(\{[^`]+\})\n```/g);
        let matchCount = 0;
        
        for (const match of toolMatches) {
          const [, functionName, argsJson] = match;
          try {
            const args = JSON.parse(argsJson);
            const toolCallId = `call_${Date.now()}_${matchCount++}`;
            const toolCall = {
              toolCallType: 'function' as const,
              toolCallId,
              toolName: functionName,
              args,
            };
            
            toolCalls.push(toolCall);
            contentParts.push({
              type: 'tool-call',
              toolCallId,
              toolName: functionName,
              input: argsJson, // V2 spec requires stringified JSON, not parsed args
            });
          } catch (e) {
            // Failed to parse this tool call, skip it
            console.warn('Failed to parse custom tool call:', e);
          }
        }
        
        // Clear text if we found tool calls
        if (toolCalls.length > 0) {
          text = undefined;
        }
      }

      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      
      return {
        content: contentParts,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        rawCall: { rawPrompt: null, rawSettings: {} },
        rawResponse: { headers: data.headers },
        warnings,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  private getChuteUrl(modelIdOrUrl: string): string {
    // If it's already a full URL, return it without path
    if (modelIdOrUrl.startsWith('http://') || modelIdOrUrl.startsWith('https://')) {
      try {
        const url = new URL(modelIdOrUrl);
        return `${url.protocol}//${url.hostname}`;
      } catch {
        // Fall through to slug handling
      }
    }
    
    // If it's just a slug, construct the URL
    return `https://${modelIdOrUrl}.chutes.ai`;
  }

  private extractModelIdentifier(modelIdOrUrl: string): string | null {
    // For Chutes.ai, the chute URL itself specifies the model
    // However, some chutes may want an explicit model parameter
    // Extract from slug patterns like "chutes-deepseek-ai-deepseek-v3"
    
    const slug = this.extractSlug(modelIdOrUrl);
    const lowerSlug = slug.toLowerCase();
    
    // Try to extract HuggingFace-style model IDs from slug
    // Example: chutes-deepseek-ai-deepseek-v3 -> deepseek-ai/DeepSeek-V3
    
    if (lowerSlug.includes('deepseek')) {
      // DeepSeek models
      if (lowerSlug.includes('v3')) return 'deepseek-ai/DeepSeek-V3';
      if (lowerSlug.includes('r1')) return 'deepseek-ai/DeepSeek-R1';
      if (lowerSlug.includes('v2')) return 'deepseek-ai/DeepSeek-V2';
    }
    
    if (lowerSlug.includes('llama')) {
      // Meta Llama models
      if (lowerSlug.includes('3-1')) {
        if (lowerSlug.includes('70b')) return 'meta-llama/Llama-3.1-70B-Instruct';
        if (lowerSlug.includes('8b')) return 'meta-llama/Llama-3.1-8B-Instruct';
      }
    }
    
    if (lowerSlug.includes('qwen')) {
      // Qwen models
      if (lowerSlug.includes('2-5')) {
        if (lowerSlug.includes('72b')) return 'Qwen/Qwen2.5-72B-Instruct';
        if (lowerSlug.includes('14b')) return 'Qwen/Qwen2.5-14B-Instruct';
      }
    }
    
    // For other models, the chute likely auto-selects the model
    // Return null to omit the model parameter
    return null;
  }

  private extractSlug(modelIdOrUrl: string): string {
    // If it's already just a slug, return it
    if (!modelIdOrUrl.includes('://') && !modelIdOrUrl.includes('.')) {
      return modelIdOrUrl;
    }

    // Extract from URL: https://chutes-deepseek-v3.chutes.ai/v1/chat/completions
    // -> chutes-deepseek-v3
    try {
      const url = new URL(modelIdOrUrl.startsWith('http') ? modelIdOrUrl : `https://${modelIdOrUrl}`);
      const hostname = url.hostname;
      
      // Remove .chutes.ai suffix
      if (hostname.endsWith('.chutes.ai')) {
        return hostname.replace('.chutes.ai', '');
      }
      
      return hostname;
    } catch {
      // If URL parsing fails, try simple string extraction
      const match = modelIdOrUrl.match(/([a-z0-9-]+)\.chutes\.ai/i);
      return match ? match[1] : modelIdOrUrl;
    }
  }

  private mapFinishReason(reason: string): LanguageModelV2FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content-filter';
      case 'tool_calls':
        return 'tool-calls';
      case 'function_call':
        return 'tool-calls';
      default:
        return 'unknown';
    }
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    request?: { body?: unknown };
    response?: { headers?: Record<string, string> };
  }> {
    const warnings: LanguageModelV2CallWarning[] = [];

    // Convert messages
    const messages = this.messageConverter.convert(options.prompt);

    // Determine the chute URL
    const chuteUrl = this.getChuteUrl(this.modelId);
    const modelForRequest = this.extractModelIdentifier(this.modelId);

    // Build request body with streaming enabled
    const body: Record<string, any> = {
      messages,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens ?? this.settings.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true, // Enable streaming
      seed: options.seed,
    };

    if (modelForRequest) {
      body.model = modelForRequest;
    }

    // Add tools if provided (V2 interface)
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      if (options.toolChoice) {
        if (options.toolChoice.type === 'required') {
          body.tool_choice = 'required';
        } else if (options.toolChoice.type === 'tool') {
          body.tool_choice = {
            type: 'function',
            function: { name: options.toolChoice.toolName },
          };
        } else if (options.toolChoice.type === 'auto' || options.toolChoice.type === 'none') {
          body.tool_choice = options.toolChoice.type;
        }
      }
    }

    try {
      const response = await (this.config.fetch ?? fetch)(
        `${chuteUrl}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            ...this.config.headers(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw this.errorHandler.handleError(new Error(`HTTP ${response.status}: ${errorText}`));
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Convert AsyncIterable to ReadableStream for V2 interface
      const asyncIterable = this.parseStreamResponse(response.body, warnings);
      
      const stream = new ReadableStream<LanguageModelV2StreamPart>({
        async start(controller) {
          try {
            for await (const part of asyncIterable) {
              controller.enqueue(part);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return {
        stream,
        request: { body },
        response: {
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      throw this.errorHandler.handleError(error);
    }
  }

  private async *parseStreamResponse(
    body: ReadableStream<Uint8Array>,
    warnings: LanguageModelV2CallWarning[]
  ): AsyncIterable<LanguageModelV2StreamPart> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Track usage across chunks
    let usage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          
          // SSE format: "data: {...}"
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Check for stream end marker
            if (data === '[DONE]') {
              continue;
            }

            try {
              const json = JSON.parse(data);

              // Extract delta content
              const choice = json.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              const finishReason = choice.finish_reason;

              // Yield text delta (V2 format)
              if (delta?.content) {
                yield {
                  type: 'text-delta',
                  id: `text-${Date.now()}`,
                  delta: delta.content,
                };
              }

              // Yield tool calls if present (V2 format)
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function?.arguments) {
                    yield {
                      type: 'tool-input-delta',
                      id: toolCall.id || `tool-${Date.now()}`,
                      delta: toolCall.function.arguments,
                    };
                  }
                }
              }

              // Track usage (usually comes in the final chunk)
              if (json.usage) {
                usage = {
                  inputTokens: json.usage.prompt_tokens || 0,
                  outputTokens: json.usage.completion_tokens || 0,
                  totalTokens: (json.usage.prompt_tokens || 0) + (json.usage.completion_tokens || 0),
                };
              }

              // Yield finish chunk when complete
              if (finishReason) {
                yield {
                  type: 'finish',
                  finishReason: this.mapFinishReason(finishReason),
                  usage: usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                };
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE chunk:', data, parseError);
              // Continue processing other chunks
            }
          }
        }
      }

      // Ensure we always yield a finish chunk
      if (usage) {
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage,
        };
      }
    } finally {
      reader.releaseLock();
    }
  }
}


