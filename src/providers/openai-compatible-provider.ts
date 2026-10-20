import OpenAI from "openai"
import { Provider, StopReason, Usage } from "../types.ts"


export function createOpenAICompatible(
    name: string,
    baseURL: string,
    apiKey: string,
    defaultModel: string

): Provider {
    const client = new OpenAI({ baseURL, apiKey })

    return {
        name,
        defaultModel,
        async *stream(opts) {
            const { messages, model, system } = opts;

            const chat: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
                role: m.role,
                content: m.content
            }))

            const stream = await client.chat.completions.create({
                model,
                stream: true,
                stream_options: { include_usage: true },
                messages: system ? [{ role: "system", content: system }, ...chat] : chat,
            })
        }
    }
}
