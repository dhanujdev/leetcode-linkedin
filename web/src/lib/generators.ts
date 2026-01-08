
export function generateTestCases(signature: string, count: number): any[] {
    // signature example: "def twoSum(self, nums: List[int], target: int) -> List[int]:"
    // We need to extract argument names and types.

    // 1. Extract content inside parentheses
    const match = signature.match(/\((.*?)\)/);
    if (!match) return [];

    const argsStr = match[1];
    // Split by comma, but be careful of nested types like List[List[int]]. 
    // Simple split by comma might fail if nested.
    // However, for V1 we assume simple nesting or just use split if we can.
    // Better regex or parser needed.
    // "nums: List[int], target: int" -> ["nums: List[int]", "target: int"]

    // Heuristic: Split by comma that is NOT inside brackets []
    const params = splitParams(argsStr);

    const generated: any[] = [];

    for (let i = 0; i < count; i++) {
        let inputStrParts: string[] = [];

        for (const param of params) {
            const [name, type] = param.split(':').map(s => s.trim());
            if (name === 'self') continue;

            const val = generateValue(type);
            inputStrParts.push(`${name} = ${JSON.stringify(val)}`);
        }

        // inputStr: "nums = [...], target = ..."
        // For Python driver, we replace commas with newlines anyway in judge.ts
        generated.push({
            input: inputStrParts.join(', '), // This comma will be replaced by newline in judge.ts
            // output we don't know yet, we will get it from reference execution
        });
    }

    return generated;
}

function splitParams(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let bracketDepth = 0;

    for (const char of str) {
        if (char === '[') bracketDepth++;
        if (char === ']') bracketDepth--;

        if (char === ',' && bracketDepth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function generateValue(type: string): any {
    // Basic types
    if (type === 'int') return getRandomInt(-100, 100);
    if (type === 'float') return Math.random() * 200 - 100;
    if (type === 'str') return getRandomString(Math.floor(Math.random() * 10));
    if (type === 'bool') return Math.random() > 0.5;

    // Lists
    if (type.startsWith('List[')) {
        // Extract inner type "int" from "List[int]"
        const inner = type.substring(5, type.length - 1);
        const len = Math.floor(Math.random() * 10); // small lists for now
        const list = [];
        for (let i = 0; i < len; i++) {
            list.push(generateValue(inner));
        }
        return list;
    }

    // Optional / Unknown
    // Fallback: return 0 or empty list?
    return 0;
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomString(len: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
}
