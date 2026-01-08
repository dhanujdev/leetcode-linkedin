
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
        return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
    }

    try {
        const submissions = await prisma.submission.findMany({
            where: { questionId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return NextResponse.json(submissions);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
