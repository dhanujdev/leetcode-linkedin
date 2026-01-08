
import { PrismaClient } from '@prisma/client';

const run = async () => {
    const p = new PrismaClient();
    const count = await p.concept.count();
    console.log(`Concepts: ${count}`);

    if (count > 0) {
        const top = await p.concept.findMany({
            include: { _count: { select: { questions: true } } },
            take: 5,
            orderBy: { questions: { _count: 'desc' } }
        });
        console.log('Top Concepts:', JSON.stringify(top, null, 2));
    }
};

run().catch(console.error);
