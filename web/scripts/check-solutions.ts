import { prisma } from '../src/lib/prisma';

async function main() {
    const count = await prisma.solution.count({
        where: { isReference: true }
    });
    console.log(`Reference Solutions found: ${count}`);

    if (count > 0) {
        const sample = await prisma.solution.findFirst({
            where: { isReference: true },
            include: { question: true }
        });
        console.log('Sample Solution:', JSON.stringify(sample, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
