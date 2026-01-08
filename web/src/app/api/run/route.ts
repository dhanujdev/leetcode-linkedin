
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeCode } from '@/lib/judge';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { questionId, language, code } = body;

        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { testSpecs: true }
        });

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const signature = question.signatureJson as any;
        const methodName = signature?.[language];

        if (!methodName) {
            return NextResponse.json({ error: `Method signature not found for ${language}. Please check problem setup.` }, { status: 400 });
        }

        const testSpec = question.testSpecs;
        const samples = testSpec?.samplesJson as any[] || [];

        if (samples.length === 0) {
            return NextResponse.json({ error: 'No sample tests found' }, { status: 400 });
        }

        const result = await executeCode(language, code, methodName, samples);

        // Parse result.run.stdout if it's JSON from our driver
        let parsedOutput = result;
        if (result.run && result.run.stdout) {
            try {
                // Find the last line that looks like JSON
                const lines = result.run.stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                parsedOutput = JSON.parse(lastLine);
            } catch (e) {
                // keep raw if not json
            }
        }

        return NextResponse.json(parsedOutput);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
