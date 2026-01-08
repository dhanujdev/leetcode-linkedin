
import { NextResponse } from 'next/server';
import { streamAIResponse } from '@/lib/llm';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();
        const { questionId, userCode, language } = context;

        // 1. Fetch Context
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: {
                solutions: {
                    where: { isReference: true, language: 'python' },
                    take: 1
                }
            }
        });

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const refSolution = question.solutions[0]?.code || 'Not available';

        // 2. Construct System Prompt
        const systemPrompt = `You are a world-class coding interview coach. 
        CONTEXT:
        Problem: ${question.title}
        Description: ${question.contentMd.substring(0, 1500)}...
        
        Reference Solution:
        ${refSolution}
        
        User's Current Code (${language}):
        ${userCode}

        INSTRUCTIONS:
        - Be Socratic. Guide them.
        - Be concisen using markdown.
        `;

        // 3. Call Streaming LLM
        // streamAIResponse returns an AsyncIterable (from OpenAI/OpenRouter SDK)
        const openRouterStream = await streamAIResponse(systemPrompt, messages);

        // 4. Create a ReadableStream to pipe the output
        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of openRouterStream) {
                        // SDK chunk structure: chunk.choices[0]?.delta?.content
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            }
        });

        // Return stream response
        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (e: any) {
        console.error("Chat Route Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
