
import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/llm';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { questionId, code, language } = await req.json();

        // 1. Fetch Question Content
        const question = await prisma.question.findUnique({
            where: { id: questionId }
        });

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        // 2. Construct Prompt
        const systemPrompt = `You are a helpful coding interview coach. 
        Your goal is to give a HINT to the user who is stuck on a problem. 
        DO NOT provide the full code solution. 
        Guide them with Socratic questioning or point out the algorithm class (e.g. "Try using a HashMap" or "Think about Two Pointers").
        Be concise.`;

        const userMessage = `
        Problem: ${question.title}
        Description: ${question.contentMd.substring(0, 1000)}...
        
        User's Current Code (${language}):
        ${code || '(No code written yet)'}
        
        Please provide a hint.
        `;

        // 3. Call LLM
        const hint = await generateAIResponse(systemPrompt, userMessage);

        if (!hint) {
            return NextResponse.json({ error: 'Failed to generate hint (AI offline or no key)' }, { status: 503 });
        }

        return NextResponse.json({ hint });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
