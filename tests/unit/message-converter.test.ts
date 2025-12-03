import { describe, it, expect } from 'vitest';

describe('Message Converter', () => {
  it('should create a message converter instance', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    expect(converter).toBeDefined();
  });

  it('should convert simple text prompt', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello, world!' }],
      },
    ]);
    
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello, world!');
  });

  it('should convert multiple text messages', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello!' }],
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there!' }],
      },
      {
        role: 'user',
        content: [{ type: 'text', text: 'How are you?' }],
      },
    ]);
    
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
  });

  it('should convert message with system prompt', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello!' }],
      },
    ]);
    
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe('You are a helpful assistant.');
  });

  it('should convert message with image', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          { 
            type: 'image', 
            image: 'https://example.com/image.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
    ]);
    
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(Array.isArray(messages[0].content)).toBe(true);
    
    const content = messages[0].content as any[];
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe('text');
    expect(content[1].type).toBe('image_url');
  });

  it('should handle base64 image data', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const messages = converter.convert([
      {
        role: 'user',
        content: [
          { 
            type: 'image', 
            image: new Uint8Array(Buffer.from(base64Data, 'base64')),
            mimeType: 'image/png',
          },
        ],
      },
    ]);
    
    expect(messages).toHaveLength(1);
    const content = messages[0].content as any[];
    expect(content[0].type).toBe('image_url');
    expect(content[0].image_url.url).toContain('data:image/png;base64,');
  });

  it('should convert tool call messages', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call_123',
            toolName: 'getWeather',
            args: { location: 'San Francisco' },
          },
        ],
      },
    ]);
    
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].tool_calls).toBeDefined();
    expect(messages[0].tool_calls[0].id).toBe('call_123');
    expect(messages[0].tool_calls[0].function.name).toBe('getWeather');
  });

  it('should convert tool result messages', async () => {
    const { ChutesMessageConverter } = await import('../../src/converters/messages');
    
    const config = {
      provider: 'chutes' as const,
      baseURL: 'https://api.chutes.ai/v1',
      headers: () => ({ 'Authorization': 'Bearer test-key' }),
    };
    
    const converter = new ChutesMessageConverter(config);
    const messages = converter.convert([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_123',
            toolName: 'getWeather',
            result: { temperature: 72, condition: 'sunny' },
          },
        ],
      },
    ]);
    
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('tool');
    expect(messages[0].tool_call_id).toBe('call_123');
  });
});

