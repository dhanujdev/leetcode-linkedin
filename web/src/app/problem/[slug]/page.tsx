
import { prisma } from '@/lib/prisma';
import Workspace from './Workspace';

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const question = await prisma.question.findUnique({
        where: { slug },
        include: {
            solutions: {
                where: { isReference: true },
                take: 1
            }
        }
    });

    if (!question) {
        return <div>Problem not found</div>;
    }

    return <Workspace question={question} referenceSolution={question.solutions[0]} />;
}
