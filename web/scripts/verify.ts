
import { PrismaClient } from '@prisma/client';

const run = async () => {
    const p = new PrismaClient();
    const q = await p.question.findFirst({
        where: { title: 'Two Sum' },
        include: { testSpecs: true }
    });

    if (!q) {
        console.error('Two Sum not found');
        return;
    }
    console.log('Testing question:', q.title);
    console.log('TestSpec:', JSON.stringify(q.testSpecs, null, 2));

    if (!q.testSpecs || !q.testSpecs.samplesJson || (q.testSpecs.samplesJson as any[]).length === 0) {
        console.error('ERROR: No samples found in DB');
        return;
    }

    const code = `
class Solution:
    def twoSum(self, nums, target):
        d = {}
        for i, x in enumerate(nums):
            if target - x in d:
                return [d[target-x], i]
            d[x] = i
        return []
    `;

    const res = await fetch('http://localhost:3001/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questionId: q.id,
            language: 'python',
            code
        })
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
};

run().catch(console.error);
