
import { PrismaClient } from '@prisma/client';

const run = async () => {
    const p = new PrismaClient();
    const q = await p.question.findFirst({ where: { title: 'Two Sum' } });
    if (!q) {
        console.error('Two Sum not found');
        return;
    }
    console.log('Testing Submit for:', q.title);

    // Correct Solution
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

    const res = await fetch('http://localhost:3001/api/submit', {
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

    // Incorrect Solution
    const badCode = `
class Solution:
    def twoSum(self, nums, target):
        return []
    `;

    console.log('\nTesting Incorrect Solution...');
    const resBad = await fetch('http://localhost:3001/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questionId: q.id,
            language: 'python',
            code: badCode
        })
    });
    console.log('Bad Res Status:', resBad.status);
    const badData = await resBad.json();
    console.log('Bad Res:', JSON.stringify(badData, null, 2));

    console.log('Checking Mistake Log...');
    const logs = await p.mistakeLog.findMany({
        where: { submissionId: badData.submissionId }
    });
    console.log('Mistake Logs:', JSON.stringify(logs, null, 2));

    if (logs.length > 0) {
        console.log('SUCCESS: Mistake log verified.');
    } else {
        console.error('FAILURE: No mistake log found.');
    }
};

run().catch(console.error);
