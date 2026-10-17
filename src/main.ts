import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk"
import { parseArgs } from "node:util";
import OpenAI from "openai"
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
        model: {
            type: "string",
            default: "nvidia/nemotron-3.5-super-vl:free"
        }
    }
})

if (!values.prompt) {
    console.error("Please provide a prompt using --prompt or -p");
    process.exit(0);
}

const response = await xaiClient.responses.create({
    model: values.model,
    max_output_tokens: 250000,
    reasoning: { "effort": "low" },
    stream: true,
    input: values.prompt,
});


for await (const event of response) {
    // you can run `exec-code -p "your prompt"`. You will get to see how the response is streamed back to you in real-time, with each event being logged to the console.
    console.log(`${event.sequence_number} -> ${event.type}:   ${event.delta ?? ""}`);
}

// const finalMessage = response.st