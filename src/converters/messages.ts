import type { LanguageModelV2Prompt } from '@ai-sdk/provider';

export interface ChutesMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | Array<any>;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface ChutesMessageConverterConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
}

export class ChutesMessageConverter {
  private config: ChutesMessageConverterConfig;

  constructor(config: ChutesMessageConverterConfig) {
    this.config = config;
  }

  convert(prompt: LanguageModelV2Prompt): ChutesMessage[] {
    const messages: ChutesMessage[] = [];

    for (const message of prompt) {
      if (message.role === 'system') {
        messages.push({
          role: 'system',
          content: message.content,
        });
        continue;
      }

      if (message.role === 'user') {
        const content = this.convertUserContent(message.content);
        messages.push({
          role: 'user',
          content,
        });
        continue;
      }

      if (message.role === 'assistant') {
        const converted = this.convertAssistantContent(message.content);
        messages.push(converted);
        continue;
      }

      if (message.role === 'tool') {
        const converted = this.convertToolContent(message.content);
        messages.push(converted);
        continue;
      }
    }

    return messages;
  }

  private convertUserContent(content: Array<any>): string | Array<any> {
    // Check if content is all text
    const allText = content.every((part) => part.type === 'text');
    
    if (allText && content.length === 1) {
      return content[0].text;
    }

    // Mixed content (text + images)
    const converted: Array<any> = [];

    for (const part of content) {
      if (part.type === 'text') {
        converted.push({
          type: 'text',
          text: part.text,
        });
      } else if (part.type === 'image') {
        converted.push(this.convertImage(part));
      } else if (part.type === 'file') {
        // Handle file attachments if needed
        converted.push({
          type: 'text',
          text: `[File: ${part.mimeType}]`,
        });
      }
    }

    return converted;
  }

  private convertImage(imagePart: any): any {
    const { image, mimeType } = imagePart;

    // Handle URL
    if (typeof image === 'string') {
      return {
        type: 'image_url',
        image_url: {
          url: image,
        },
      };
    }

    // Handle Uint8Array (base64 data)
    if (image instanceof Uint8Array) {
      const base64 = this.uint8ArrayToBase64(image);
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType ?? 'image/jpeg'};base64,${base64}`,
        },
      };
    }

    // Fallback
    return {
      type: 'image_url',
      image_url: {
        url: String(image),
      },
    };
  }

  private uint8ArrayToBase64(array: Uint8Array): string {
    // Convert Uint8Array to base64
    const binary = Array.from(array)
      .map((byte) => String.fromCharCode(byte))
      .join('');
    
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(array).toString('base64');
    }
    
    return btoa(binary);
  }

  private convertAssistantContent(content: Array<any>): ChutesMessage {
    const message: ChutesMessage = {
      role: 'assistant',
      content: '',
    };

    const textParts: string[] = [];
    const toolCalls: Array<any> = [];

    for (const part of content) {
      if (part.type === 'text') {
        textParts.push(part.text);
      } else if (part.type === 'tool-call') {
        toolCalls.push({
          id: part.toolCallId,
          type: 'function',
          function: {
            name: part.toolName,
            // V2 uses 'input' which is already stringified JSON, not 'args'
            arguments: part.input || JSON.stringify(part.args || {}),
          },
        });
      }
    }

    // Set content
    if (textParts.length > 0) {
      message.content = textParts.join('\n');
    } else {
      // Try empty string instead of null - Chutes API might not handle null well
      message.content = '';
    }

    // Set tool calls
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    return message;
  }

  private convertToolContent(content: Array<any>): ChutesMessage {
    // Tool result messages
    const toolResult = content.find((part) => part.type === 'tool-result');
    
    if (toolResult) {
      // Note: Omitting 'name' field - Chutes API may not support it
      // The tool_call_id is sufficient to match the call
      return {
        role: 'tool',
        tool_call_id: toolResult.toolCallId,
        content: JSON.stringify(toolResult.result),
      };
    }

    // Fallback
    return {
      role: 'tool',
      content: JSON.stringify(content),
    };
  }
}

