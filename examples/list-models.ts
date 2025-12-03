import { createChutes } from '../src';

async function main() {
  const chutes = createChutes({
    apiKey: process.env.CHUTES_API_KEY,
  });

  console.log('Discovering available models...\n');

  // List all models
  const allModels = await chutes.listModels();
  console.log(`Total models available: ${allModels.length}\n`);

  // List by type
  const llmModels = await chutes.listModels('llm');
  console.log(`LLM models: ${llmModels.length}`);
  llmModels.slice(0, 3).forEach((model) => {
    console.log(`  - ${model.name} (${model.slug})`);
    console.log(`    ID: ${model.chute_id}`);
  });

  console.log('\n');

  // Get capabilities for first LLM
  if (llmModels.length > 0) {
    const firstLLM = llmModels[0];
    console.log(`Capabilities for ${firstLLM.name}:`);
    
    const capabilities = await chutes.getModelCapabilities(firstLLM.slug);
    console.log(JSON.stringify(capabilities, null, 2));
  }
}

main().catch(console.error);

