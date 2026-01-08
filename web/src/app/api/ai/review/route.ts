
import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/llm';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { questionId, code, language } = await req.json();

        const question = await prisma.question.findUnique({ where: { id: questionId } });
        if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

        const systemPrompt = `You are a senior engineer conducting a code review.
        Identify potential bugs, edge cases missing, or time/space complexity issues.
        Be constructive and encouraging. 
        If the code looks correct, suggest a minor optimization or alternative approach.
        Keep it under 200 words.`;

        const userMessage = `
        Problem: ${question.title}
        User's Code (${language}):
        ${code}
        `;

        const review = await generateAIResponse(systemPrompt, userMessage);

        if (!review) {
            return NextResponse.json({ error: 'Failed to generate review' }, { status: 503 });
        }

        return NextResponse.json({ review });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
