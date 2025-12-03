# Next.js Test Application

A minimal Next.js application for testing the `@chutes-ai/ai-sdk-provider` package in a real Next.js environment.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```bash
   CHUTES_API_KEY=your_api_key_here
   ```

## Running the Test

### Development Mode

```bash
npm run dev
```

Visit `http://localhost:3000` to test the API route.

### Production Mode

```bash
npm run build
npm start
```

### Automated Test

With the dev or production server running:

```bash
npm test
```

## What's Tested

- Provider instantiation in Next.js API routes
- Model creation with chute URLs
- Streaming text generation
- Vercel AI SDK integration
- TypeScript support
- Environment variable loading

