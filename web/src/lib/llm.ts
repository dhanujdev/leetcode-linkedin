import { OpenRouter } from "@openrouter/sdk";

// Initialize OpenRouter Client
const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * Standard non-streaming generation
 */
export async function generateAIResponse(
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.2
): Promise<string | null> {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            console.warn("OPENROUTER_API_KEY is not set");
            return null;
        }

        // Using client.chat.send as per user instruction (casting to any to avoid type check issues if definitions lag)
        const completion: any = await (client.chat as any).send({
            model: "qwen/qwen-2.5-coder-32b-instruct:free",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature,
        });

        return completion.choices[0]?.message?.content || null;
    } catch (e) {
        console.error("LLM Call Failed:", e);
        return null;
    }
}

/**
 * Streaming generation for Chat Interface
 * Returns the raw stream from OpenRouter SDK
 */
export async function streamAIResponse(
    systemPrompt: string,
    messages: { role: "user" | "assistant", content: string }[],
    temperature: number = 0.2
) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }

    const allMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...messages
    ];

    try {
        // Streaming call
        const stream = await (client.chat as any).send({
            model: "qwen/qwen3-coder:free",
            messages: allMessages,
            temperature,
            stream: true,
        });

        return stream;
    } catch (e) {
        console.error("Stream Init Failed:", e);
        throw e;
    }
}
