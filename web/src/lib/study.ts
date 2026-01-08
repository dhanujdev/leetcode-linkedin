
import { prisma } from '@/lib/prisma';

export async function updateMastery(questionId: string, submissionId: string, isCorrect: boolean) {
    // 1. Update UserProgress
    const now = new Date();
    await prisma.userProgress.upsert({
        where: { questionId },
        update: {
            status: isCorrect ? 'AC' : 'WA',
            lastAttemptAt: now,
            bestStatus: isCorrect ? 'AC' : undefined
        },
        create: {
            questionId,
            status: isCorrect ? 'AC' : 'WA',
            lastAttemptAt: now,
            bestStatus: isCorrect ? 'AC' : undefined
        }
    });

    // 2. Fetch Concepts
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { concepts: { include: { concept: true } } }
    });

    console.log(`updateMastery: QID=${questionId}, found=${!!question}, concepts=${question?.concepts?.length}`);

    if (!question || !question.concepts) return;

    // 3. Update Concept Mastery
    for (const qc of question.concepts) {
        console.log(`Processing concept: ${qc.conceptId}`);
        const conceptId = qc.conceptId;

        const mastery = await prisma.conceptMastery.findUnique({ where: { conceptId } })
            || await prisma.conceptMastery.create({ data: { conceptId, score: 0 } });

        let newScore = mastery.score;
        let nextReview = new Date(); // Default now

        if (isCorrect) {
            newScore = Math.min(100, mastery.score + 10);

            // Simple intervals based on score buckets
            let days = 1;
            if (newScore > 80) days = 14;
            else if (newScore > 50) days = 7;
            else if (newScore > 20) days = 3;

            nextReview.setDate(nextReview.getDate() + days);
        } else {
            // Penalty
            newScore = Math.max(0, mastery.score - 15);
            // Review immediately (tomorrow)
            nextReview.setDate(nextReview.getDate() + 1);

            // Log Mistake
            console.log(`Creating mistake log for concept ${conceptId} in submission ${submissionId}`);
            try {
                await prisma.mistakeLog.create({
                    data: {
                        submissionId,
                        mistakeType: 'Conceptual',
                        conceptId,
                        notes: `Failed on ${question.title}`
                    }
                });
            } catch (e) {
                console.error('MistakeLog Create Error:', e);
            }
        }

        await prisma.conceptMastery.update({
            where: { conceptId },
            data: {
                score: newScore,
                lastReviewedAt: now,
                nextReviewAt: nextReview
            }
        });
    }
}

export async function getDailyPlan(limit: number = 3) {
    const now = new Date();

    // Get concepts needing attention
    const concepts = await prisma.conceptMastery.findMany({
        where: {
            OR: [
                { nextReviewAt: { lte: now } },
                { score: { lt: 50 } }
            ]
        },
        orderBy: [
            { nextReviewAt: 'asc' },
            { score: 'asc' }
        ],
        take: 3
    });

    // For each concept, pick 1 question joining UserProgress to find unattempted or WA
    let questionsPool: any[] = [];

    for (const cm of concepts) {
        const qs = await prisma.question.findMany({
            where: {
                concepts: { some: { conceptId: cm.conceptId } },
            },
            include: { userProgress: true },
            take: 10
        });

        qs.sort((a, b) => {
            const statusA = a.userProgress?.status || 'NONE';
            const statusB = b.userProgress?.status || 'NONE';
            const score = (s: string) => {
                if (s === 'NONE') return 0;
                if (s === 'WA') return 1;
                return 2;
            };
            return score(statusA) - score(statusB);
        });

        if (qs.length > 0) questionsPool.push(qs[0]);
    }

    if (questionsPool.length < limit) {
        const fillers = await prisma.question.findMany({
            where: { userProgress: { is: null } },
            take: limit - questionsPool.length
        });
        questionsPool = [...questionsPool, ...fillers];
    }

    const unique = Array.from(new Set(questionsPool.map(q => q.id)))
        .map(id => questionsPool.find(q => q.id === id));

    return unique.slice(0, limit);
}
