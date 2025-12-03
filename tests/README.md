# Tests

This directory contains all tests for the `@chutes-ai/ai-sdk-provider` package.

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual components (20 files)
├── integration/             # Integration tests with live API (11 files)
├── slow/                    # Slow tests - video generation (2 files)
├── setup/                   # Global test setup - chute discovery & warmup
├── fixtures/                # Test fixtures and mock data
└── test-nextjs/            # Next.js test application
```

## Test Coverage Summary

**Total Features:** 82  
**✅ Fully Covered:** 71 features (86.6%)  
**Test Files:** 33 total  
**Test Cases:** 330+ individual tests

### Coverage by Category

- ✅ **Provider & Configuration** - Full coverage (7/7 features)
- ✅ **Language Models** - Comprehensive coverage (13/13 features)
- ✅ **Embeddings** - Full coverage (2/2 features)
- ✅ **Image Generation** - Good coverage (4/4 features)
- ✅ **Video Generation** - Full coverage (4/4 features)
- ✅ **Audio/TTS** - Full coverage (6/6 features)
- ✅ **Speech-to-Text** - Full coverage (5/5 features)
- ✅ **Music Generation** - Full coverage (3/3 features)
- ✅ **Content Moderation** - Type tests (4/4 features)
- ✅ **Custom Inference** - Type tests (5/5 features)
- ✅ **Model Discovery** - Full coverage (11/11 features)
- ✅ **Error Handling** - Full coverage (4/4 features)
- ✅ **Therm (Warmup)** - Full coverage (12/12 features)
- ✅ **Type Safety & Utilities** - Full coverage (2/2 features)

See `TEST-COVERAGE-AUDIT.md` for detailed coverage analysis.

## Global Test Setup

The `tests/setup/` directory contains global test configuration:

- **`global-warmup.ts`** - Runs once before all tests to:
  - Discover chutes for each type (LLM, Image, Video, Embedding, TTS, STT)
  - Warm them up via the therm API
  - Set environment variables (`WARMED_*_CHUTE`) for tests to use

- **`test-chutes.ts`** - Utilities for test chute discovery and warmup

This ensures integration tests run against pre-warmed chutes, reducing flakiness and cold-start delays.

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### Slow Tests (Video Generation)

```bash
npm run test:slow
```

### Specific Test File

```bash
npm test tests/unit/voice-utilities.test.ts
```

### Watch Mode (for development)

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

## Test Configuration

### Required Environment Variables

Set the following in a `.env` file in the project root:

```env
CHUTES_API_KEY=your-api-key-here
```

### Optional Environment Variables

```env
TEST_CHUTE_URL=https://your-chute.chutes.ai  # Override default LLM test chute
DISCOVERED_IMAGE_CHUTE=https://...           # Override image chute
DISCOVERED_VIDEO_CHUTE=https://...           # Override video chute
```

## Test Types

### Unit Tests (20 files)

Test individual components in isolation without API calls:
- `provider.test.ts` - Provider factory
- `provider-config.test.ts` - Provider configuration
- `provider-methods.test.ts` - Provider methods
- `model-registry.test.ts` - Model registry
- `model-registry-methods.test.ts` - Registry filtering methods
- `voice-utilities.test.ts` - Voice utility functions (54 voices)
- `version.test.ts` - VERSION export
- `types.test.ts` - TypeScript type definitions
- `errors.test.ts` - Error handling
- `error-chute-id.test.ts` - Chute ID tracking in errors
- `message-converter.test.ts` - Message format conversion
- `chute-discovery.test.ts` - Chute discovery utilities
- `chute-discovery-video.test.ts` - Video chute filtering
- `audio-model.test.ts` - Audio model structure
- `video-model.test.ts` - Video model structure
- `moderation-model.test.ts` - Moderation model structure
- `inference-model.test.ts` - Inference model structure
- `image-model-retry.test.ts` - Image retry logic
- `therm.test.ts` - Chute warmup (therm) utility + ThermalMonitor (46 tests)
- `test-warmup.test.ts` - Global warmup module (20 tests)

### Integration Tests (11 files)

Test real API interactions (require `CHUTES_API_KEY`):
- `basic-generation.test.ts` - Text generation
- `streaming-generation.test.ts` - Streaming responses
- `tool-calling.test.ts` - Function/tool calling
- `language-model-parameters.test.ts` - LLM parameters (topP, penalties, etc.)
- `embeddings.test.ts` - Text embeddings
- `image-generation.test.ts` - Image generation
- `provider-methods.test.ts` - listModels, getModelCapabilities
- `error-chute-id.test.ts` - Error propagation
- `error-chute-id-tracking.test.ts` - Chute ID tracking
- `audio-tts-stt-roundtrip.test.ts` - TTS→STT round-trip
- `therm.test.ts` - Chute warmup integration

### Slow Tests (2 files)

Long-running tests that require significant API time:
- `video-generation.test.ts` - Video generation integration
- `video-generation-real.test.ts` - Real video API tests

## CI/CD Readiness

All tests are designed for CI/CD environments:

✅ **Environment Checks** - Tests gracefully skip when API key is missing  
✅ **Timeouts** - Appropriate timeouts for API calls (10-60s)  
✅ **Retries** - Integration tests include retry logic for flaky operations  
✅ **Test Helpers** - Shared utilities in `test-helpers.ts`  
✅ **No Hardcoded Values** - Uses environment variables  
✅ **Dynamic Discovery** - Tests discover available models dynamically  
✅ **Global Warmup** - Pre-warms chutes before tests run

### GitHub Actions

See `.github/workflows/test.yml` for the full CI/CD configuration. The pipeline includes:

| Job | Duration | API Key |
|-----|----------|---------|
| Unit Tests | ~30s | ❌ Not needed |
| Integration Tests | ~2-3min | ✅ Required |
| Slow Tests | ~5+min | ✅ Required |
| Type Check | ~15s | ❌ Not needed |
| Build | ~30s | ❌ Not needed |

## Notes

- Integration tests require a valid `CHUTES_API_KEY`
- Tests that require unavailable resources are automatically skipped
- Some tests use retry logic to handle LLM non-determinism
- All tests use environment variable checks for API availability
- Global warmup runs before all tests to pre-warm discovered chutes

## Next.js Test Application

The `test-nextjs/` directory contains a complete Next.js application for integration testing. See `test-nextjs/README.md` for details.

## Contributing

When adding new features:
1. Write unit tests first (TDD approach)
2. Add integration tests for API-dependent features
3. Update this README and `TEST-COVERAGE-AUDIT.md`
4. Ensure all tests pass locally before committing

For questions about testing, see `TEST-COVERAGE-AUDIT.md` for detailed feature coverage analysis.
