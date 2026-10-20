import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk"
import { parseArgs } from "node:util";
import OpenAI from "openai"
import { getProvider } from "./providers/index.ts";
import { Message } from "./types.ts";
// load the .env next to the code, so exec-code works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const anthropicClient = new Anthropic()

const xaiClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});


const { values } = parseArgs({
    options: {
        prompt: {
            type: "string",
            short: "p",
        },
        provider: {
            type: "string",
            default: "openrouter"
        },
        model: {
            type: "string",
            default: "nvidia/nemotron-3.5-super-vl:free"
        }
    }
})

if (!values.prompt) {
    console.error("Please provide a prompt using --prompt or -p");
    process.exit(1);
}

const provider = getProvider(values.provider);
const model = provider.defaultModel;
const messages: Message[] = [{ role: "user", content: values.prompt }];


for await (const event of provider.stream({ messages, model })) {

    if (event.type == "text_delta") {
        console.log(`[${event.type}] ${event?.delta ?? ""}`)
    } else {
        const { usage, stopReason } = event.message;

        console.log(`\n\n ${provider.name} with model ${model} finished with stop reason: ${stopReason}, usage: input=${usage.input}, output=${usage.output}`)
    }
}


// const finalMessage = response.st