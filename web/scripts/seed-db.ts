
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
const DATA_DIR = path.resolve(__dirname, '../../linkedin-questions');

async function main() {
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Data directory not found: ${DATA_DIR}`);
        process.exit(1);
    }

    const dirs = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());
    console.log(`Found ${dirs.length} problem directories.`);

    for (const dir of dirs) {
        const match = dir.match(/^(\d+)\.(.+)$/);
        if (!match) continue;

        const leetcodeId = match[1];
        const title = match[2];
        const slug = title.toLowerCase().replace(/ /g, '-');
        const fullPath = path.join(DATA_DIR, dir);

        let readmePath = path.join(fullPath, 'README.md');
        if (!fs.existsSync(readmePath)) {
            readmePath = path.join(fullPath, 'README_EN.md');
        }

        if (!fs.existsSync(readmePath)) {
            console.warn(`No README found for ${dir}`);
            continue;
        }

        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        const contentSplit = readmeContent.split('## Solutions');
        const contentMd = contentSplit[0];
        const solutionsMd = contentSplit[1] || '';

        const samples = extractSamples(contentMd);
        const tags = extractTags(readmeContent);

        const difficultyMatch = readmeContent.match(/difficulty:\s*(\w+)/);
        const difficulty = difficultyMatch ? difficultyMatch[1] : 'Medium';

        let pythonCode = '';
        const pyPath = path.join(fullPath, 'Solution.py');
        if (fs.existsSync(pyPath)) {
            pythonCode = fs.readFileSync(pyPath, 'utf-8');
        } else {
            pythonCode = extractCodeFromMd(solutionsMd, 'python') || extractCodeFromMd(solutionsMd, 'python3');
        }

        let jsCode = '';
        const jsPath = path.join(fullPath, 'Solution.js');
        if (fs.existsSync(jsPath)) {
            jsCode = fs.readFileSync(jsPath, 'utf-8');
        } else {
            jsCode = extractCodeFromMd(solutionsMd, 'js') || extractCodeFromMd(solutionsMd, 'javascript') || extractCodeFromMd(solutionsMd, 'ts') || extractCodeFromMd(solutionsMd, 'typescript');
        }

        let signature: any = {};
        if (pythonCode) {
            const defMatch = pythonCode.match(/(def\s+(\w+)\s*\(.*?\)\s*(?:->\s*.*?)?:)/);
            if (defMatch) {
                signature['python'] = defMatch[2]; // name
                signature['pythonDef'] = defMatch[1]; // full def
            }
        }
        if (jsCode) {
            const funcMatch = jsCode.match(/(?:var|let|const|function)\s+(\w+)\s*(?:=|:|\()/);
            if (funcMatch) {
                signature['javascript'] = funcMatch[1];
            }
        }

        const question = await prisma.question.upsert({
            where: { leetcodeId },
            update: { title, slug, difficulty, contentMd, signatureJson: signature },
            create: { leetcodeId, title, slug, difficulty, contentMd, signatureJson: signature, checkerType: 'EXACT' }
        });

        await prisma.testSpec.upsert({
            where: { questionId: question.id },
            update: { samplesJson: samples },
            create: { questionId: question.id, samplesJson: samples, fuzzCount: 50 }
        });

        if (pythonCode) {
            const exist = await prisma.solution.findFirst({ where: { questionId: question.id, language: 'python', isReference: true } });
            if (exist) await prisma.solution.update({ where: { id: exist.id }, data: { code: pythonCode } });
            else await prisma.solution.create({ data: { questionId: question.id, language: 'python', code: pythonCode, isReference: true } });
        }

        if (jsCode) {
            const exist = await prisma.solution.findFirst({ where: { questionId: question.id, language: 'javascript', isReference: true } });
            if (exist) await prisma.solution.update({ where: { id: exist.id }, data: { code: jsCode } });
            else await prisma.solution.create({ data: { questionId: question.id, language: 'javascript', code: jsCode, isReference: true } });
        }

        // --- Concepts ---
        for (const tag of tags) {
            const concept = await prisma.concept.upsert({
                where: { name: tag },
                update: {},
                create: { name: tag }
            });

            await prisma.questionConcept.upsert({
                where: { questionId_conceptId: { questionId: question.id, conceptId: concept.id } },
                update: {},
                create: { questionId: question.id, conceptId: concept.id }
            });

            // Init mastery
            await prisma.conceptMastery.upsert({
                where: { conceptId: concept.id },
                update: {},
                create: { conceptId: concept.id, score: 0 }
            });
        }
    }
}

function extractCodeFromMd(md: string, lang: string): string {
    const regex = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\`\`\``, 'i');
    const match = md.match(regex);
    return match ? match[1] : '';
}

function extractSamples(md: string): any[] {
    const samples: any[] = [];
    const cleanMd = md.replace(/<[^>]+>/g, '');
    const regex = /Input:\s*(.+?)\s+Output:\s*(.+?)(?=\s*(?:Explanation|Example|$))/g;
    let match;
    while ((match = regex.exec(cleanMd)) !== null) {
        samples.push({
            input: match[1].trim(),
            output: match[2].trim()
        });
    }
    return samples;
}

function extractTags(readme: string): string[] {
    // Relaxed regex to handle CRLF and spacing
    const match = readme.match(/tags:\s*[\r\n]+((?:\s*-\s+.+[\r\n]*)+)/);
    if (!match) {
        // console.log('No tags match found');
        return [];
    }
    const block = match[1];
    const tags = block.split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l.startsWith('-'))
        .map(l => l.replace(/^-\s+/, '').trim())
        .filter(t => t.length > 0);

    // console.log('Extracted tags:', tags);
    return tags;
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
