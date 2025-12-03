# Examples

Practical examples demonstrating how to use the Chutes.ai provider with the Vercel AI SDK.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your API key:
   ```bash
   export CHUTES_API_KEY="your-api-key-here"
   ```

## Running Examples

Run any example using `tsx`:

```bash
tsx examples/basic-chat.ts        # Simple text generation
tsx examples/streaming.ts         # Streaming responses
tsx examples/tool-calling.ts      # Function calling
tsx examples/image-generation.ts  # Image generation
tsx examples/embeddings.ts        # Text embeddings
tsx examples/chute-warmup.ts      # Chute warmup (Therm) ⚡
```

## Customization

### Using Different Models

Replace the chute URL in any example:
```typescript
const model = chutes('https://your-chute-url.chutes.ai');
```

### Using Default Models

Set a default model to avoid specifying it each time:

```bash
# Set environment variable
export CHUTES_DEFAULT_MODEL=https://chutes-deepseek-ai-deepseek-v3.chutes.ai
```

Then use without specifying a model:
```typescript
import { createChutes } from '@chutes-ai/ai-sdk-provider';

const chutes = createChutes({ apiKey: process.env.CHUTES_API_KEY });
const model = await chutes(); // Uses default model from CHUTES_DEFAULT_MODEL

// Or configure explicitly
const chutes2 = createChutes({ 
  apiKey: process.env.CHUTES_API_KEY,
  defaultModel: 'https://chutes-deepseek-ai-deepseek-v3.chutes.ai'
});
const model2 = await chutes2(); // Uses configured default
```

For more details, see the [main README](../README.md#using-a-default-model-lazy-discovery).

### Adjusting Parameters

```typescript
const result = await generateText({
  model,
  prompt: 'Your prompt here',
  temperature: 0.7,
  maxTokens: 500,
  topP: 0.9,
});
```

## Notes

- Each chute has its own subdomain (e.g., `https://chutes-deepseek-v3.chutes.ai`)
- Not all models support all features (e.g., tool calling, streaming)
- Check the chute's capabilities before use

For complete documentation, see the [main README](../README.md).

