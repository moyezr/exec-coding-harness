import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk"
import { parseArgs } from "node:util";
import OpenAI from "openai"
import { getProvider } from "./providers/index.ts";
import { AssistantMessage, Message } from "./types.ts";
import { readTool } from "./tools/read.ts";
// load the .env next to the code, so exec-code works from any folder
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
import { tools } from "./tools/index.ts"
import { runAgent } from "./agent/loop.ts";

const anthropicClient = new Anthropic()

const xaiClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});


const systemPrompt = `You're a helpful coding assistant.`

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
            // default: "nvidia/nemotron-3.5-super-vl:free",
            default: "openai/gpt-6-luna"
        }
    }
})

console.log(`Using provider: ${values.provider}, model: ${values.model}`)

if (!values.prompt) {
    console.error("Please provide a prompt using --prompt or -p");
    process.exit(1);
}

const provider = getProvider(values.provider,);
const model = values.model ?? provider.defaultModel;
const messages: Message[] = [{ role: "user", content: values.prompt }];


await runAgent({
    provider,
    model,
    tools,
    messages,
    onEvent(event) {
        if (event.type === "text") process.stdout.write(event.delta);
        else if (event.type == "tool_start") console.log(`\n ${event.call.name}`);
        else if (event.type == "tool_end") {
            const lines = event.result.split("\n").length;
            console.log(`\n ${event.isError ? event.result : lines}`);
        } else if (event.type === "turn_end") {
            const { usage, stopReason } = event.message;
            console.log(
                `\n\n  ${provider.name} ... ${model} ... ${usage.input} ... ${usage.output} ... ${stopReason}`,
            );
        }
    },
});

// async function callModel(): Promise<AssistantMessage> {
//     for await (const event of provider.stream({ messages, model, tools })) {
//         if (event.type == "text_delta") {
//             console.log(`[${event.type}] ${event?.delta ?? ""}`)
//         } else {
//             const { usage, stopReason } = event.message;

//             console.log(`\n\n ${provider.name} with model ${model} finished with stop reason: ${stopReason}, usage: input=${usage.input}, output=${usage.output}`)
//             return event.message;
//         }
//     }

//     throw new Error("Stream ended without a final message");

// }


// const first = await callModel()
// messages.push(first)
// console.log(`##### ${first.stopReason}`)


// if (first.stopReason === "toolUse") {
//     for (const block of first.content) {
//         if (block.type !== "toolCall") continue;
//         console.log(`-> ${block.name}(${JSON.stringify(block.arguments)})`);
//         const result = await readTool.execute(block.arguments);
//         messages.push({ role: "toolResult", toolCallId: block.id, toolName: block.name, content: result, isError: false });
//     }
//     // round 2: the model sees the tool result and answers
//     messages.push(await callModel());
// }

// const finalMessage = response.st