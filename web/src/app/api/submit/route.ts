
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeCode } from '@/lib/judge';
import { updateMastery } from '@/lib/study';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { questionId, language, code } = body;

        // 1. Fetch Question & Reference Solution
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: {
                testSpecs: true,
                solutions: { where: { isReference: true, language } }
            }
        });

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const referenceSolution = question.solutions[0];
        if (!referenceSolution) {
            return NextResponse.json({ error: 'Reference solution not found for this language.' }, { status: 500 });
        }

        const signature = question.signatureJson as any;
        const methodName = signature?.[language];

        if (!methodName) {
            return NextResponse.json({ error: `Method signature not found for ${language}.` }, { status: 400 });
        }

        // 2. Prepare Test Cases
        const testSpec = question.testSpecs;
        const rawSamples = testSpec?.samplesJson as any[] || [];
        // Normalize samples to { input, expected } structure
        const samples = rawSamples.map(s => ({
            input: s.input,
            expected: s.expected || s.output // Use output if expected not present
        }));

        // B. Fuzz generation
        let fuzzCases: any[] = [];
        let fuzzCount = 1;

        if (language === 'python' && signature.pythonDef) {
            try {
                const { generateTestCases } = require('@/lib/generators');
                fuzzCases = generateTestCases(signature.pythonDef, fuzzCount).map((c: any) => ({ ...c, expected: null }));
                console.log(`Generated ${fuzzCases.length} fuzz cases using signature: ${signature.pythonDef}`);
            } catch (e) {
                console.error("Fuzz generation failed:", e);
            }
        }

        const allTestCases = [...samples, ...fuzzCases];

        // 3. Execution
        // A. Reference Execution
        const refResult = await executeCode(language, referenceSolution.code, methodName, allTestCases);

        if (refResult.error) {
            console.error("Reference execution failed:", refResult);
        } else if (Array.isArray(refResult)) {
            // Update expected outputs for fuzz cases (and samples)
            allTestCases.forEach((test, i) => {
                if (refResult[i] && refResult[i].id === i && refResult[i].passed === false) {
                    test.expected = refResult[i].actual;
                }
            });
        }

        // B. User Execution
        await new Promise(r => setTimeout(r, 500));
        const userResult = await executeCode(language, code, methodName, allTestCases);

        // 4. Score / Verdict
        let finalStatus = 'AC';
        let passedCount = 0;
        let totalCount = allTestCases.length;
        let failedCase = null;

        if (userResult.error) {
            finalStatus = 'Runtime Error';
        } else if (Array.isArray(userResult)) {
            for (const res of userResult) {
                // Determine expected value
                const expectedVal = allTestCases[res.id]?.expected;

                // FILTER: If expected value is missing (ref failed or returned null for invalid input)
                // we skip grading this case.
                if (expectedVal === undefined || expectedVal === null || expectedVal === 'null') {
                    totalCount--;
                    continue;
                }

                const actual = normalize(res.actual);
                const expected = normalize(expectedVal);

                if (actual === expected) {
                    passedCount++;
                } else {
                    finalStatus = 'WA';
                    failedCase = {
                        input: allTestCases[res.id].input,
                        expected: expected,
                        actual: actual
                    };
                    break;
                }
            }
        } else {
            finalStatus = 'Runtime Error';
        }

        // 5. Store Submission
        const submission = await prisma.submission.create({
            data: {
                questionId,
                language,
                code,
                status: finalStatus,
                runtimeMs: 0,
                failedCaseJson: failedCase ? failedCase : undefined
            }
        });

        // 6. Update Mastery
        await updateMastery(questionId, submission.id, finalStatus === 'AC');

        return NextResponse.json({
            submissionId: submission.id,
            status: finalStatus,
            passed: passedCount,
            total: totalCount,
            failedCase,
            rawResult: userResult
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function normalize(str: string): string {
    if (!str) return '';
    try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj);
    } catch (e) {
        return str.replace(/\s+/g, '');
    }
}
