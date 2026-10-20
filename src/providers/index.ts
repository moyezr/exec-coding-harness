import { Provider } from "../types.ts";
import { createAnthropic } from "./anthropic.ts";
import { createOpenAICompatible } from "./openai-compatible-provider.ts";


const providersRecord: Record<string, () => Provider> = {
    "anthropic": createAnthropic,
    "anthropic-openai": () => createOpenAICompatible("anthropic-openai", "https://api.anthropic.com/v1", process.env.ANTHROPIC_API_KEY!, "claude-haiku-5.5"),
    groq: () => createOpenAICompatible("groq", "https://api.groq.ai/openai/v1", process.env.GROQ_API_KEY!, "groq-3.5-mini"),
    openrouter: () => createOpenAICompatible("openrouter", "https://openrouter.ai/api/v1", process.env.OPENROUTER_API_KEY!, "nvidia/nemotron-3.5-super-vl:free"),
}

export function getProvider(name: string): Provider {
    const provider = providersRecord[name];

    if (!provider) {
        throw new Error(`Provider ${name} not found. Available providers: ${Object.keys(providersRecord).join(", ")}`);
    }

    return provider();
}

