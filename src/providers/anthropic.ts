import Anthropic from "@anthropic-ai/sdk"
import { Provider, StreamOptions, StopReason } from "../types.ts"


export function createAnthropic(): Provider {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    return {
        name: "anthropic",
        defaultModel: "claude-haiu-5.5",
        async *stream(opts: StreamOptions) {
            const { messages, model, system } = opts;

            const stream = await client.messages.stream({
                model,
                max_tokens: 4096,
                system,
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
            })

            let txt = ""
            for await (const event of stream) {

                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                    txt += event.delta.text
                    yield { type: "text_delta", delta: event.delta.text }
                }
            }

            const final = await stream.finalMessage();

            const stopReason: StopReason = final.stop_reason === "max_tokens" ? "length" : "stop";

            yield {
                type: "done",
                message: {
                    role: "assistant",
                    content: txt,
                    usage: { input: final.usage.input_tokens, output: final.usage.output_tokens },
                    stopReason: stopReason
                }
            }
        }
    }
}