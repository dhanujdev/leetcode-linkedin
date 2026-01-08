
import { PrismaClient } from '@prisma/client';

const PISTON_API = process.env.PISTON_URL || 'http://127.0.0.1:2000';

export async function executeCode(
    language: string,
    userCode: string,
    methodName: string,
    samples: any[]
) {
    let driverCode = '';
    let fileName = '';

    if (language === 'python') {
        driverCode = generatePythonDriver(userCode, methodName, samples);
        fileName = 'solution.py';
    } else if (language === 'javascript') {
        driverCode = generateJavascriptDriver(userCode, methodName, samples);
        fileName = 'solution.js';
    } else {
        throw new Error(`Unsupported language: ${language}`);
    }

    // Call Piston
    try {
        const response = await fetch(`${PISTON_API}/api/v2/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: language,
                version: language === 'python' ? '3.10.0' : '18.15.0', // Approximate versions
                files: [
                    {
                        name: fileName,
                        content: driverCode,
                    },
                ],
            }),
        });

        // Check if Piston is reachable
        if (!response.ok) {
            const txt = await response.text();
            return { error: `Piston error: ${response.status} ${txt}` };
        }

        const result = await response.json();

        if (result.run && result.run.stdout) {
            try {
                // The driver prints a JSON array at the end. 
                // However, there might be other stdout if user used print()??
                // Our driver wraps everything, but user print() inside function executes.
                // It might clutter stdout.
                // Our driver prints the result as the LAST line?
                // Or we can assume user print goes to stdout, and we only look for our json?
                // The driver does `print(json.dumps(results))` at the very end.
                // So we should find the last line that parses as JSON?
                const lines = result.run.stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                return JSON.parse(lastLine);
            } catch (e) {
                // If parse fails, maybe runtime error content?
                return { error: 'Output parsing failed: ' + result.run.stdout + ' | Stderr: ' + result.run.stderr };
            }
        } else if (result.run && result.run.stderr) {
            return { error: result.run.stderr };
        }

        return { error: 'No output from execution' };
    } catch (e: any) {
        return { error: `Execution failed: ${e.message}` };
    }
}

function generatePythonDriver(userCode: string, methodName: string, samples: any[]) {
    // We need to parse samples to inject them.
    // Sample structure: { input: "nums = [2,7...], target = 9", output: "[0,1]" }
    // We will construct formatted lists in Python.

    const testCasesStr = JSON.stringify(samples.map(s => {
        let input = s.input || '';
        if (input) {
            input = input.replace(/, (?=[a-zA-Z_]\w*\s*=)/g, '\n');
        }
        return {
            input_code: input,
            expected: s.output
        };
    }));

    return `
import sys
import json
from typing import *
import math
import collections
import heapq
import bisect
import random
import functools
from collections import deque, defaultdict, Counter
from functools import lru_cache

${userCode}

# Driver Code
def run_tests():
    sol = Solution()
    test_cases = ${testCasesStr}
    
    results = []
    
    for i, test in enumerate(test_cases):
        # Prepare input environment
        input_code = test['input_code']
        # We use exec to define variables derived from input_code
        # e.g. "nums = [1,2]" sets 'nums' in local scope.
        local_scope = {}
        try:
            exec(input_code, {}, local_scope)
        except Exception as e:
            results.append({'status': 'Runtime Error (Input Parsing)', 'id': i, 'error': str(e)})
            continue

        # Extract arguments. We assume inputs match variables expected by method?
        # or we try to pass all locals?
        # We need to know argument names.
        # Fallback: inspect signature from Solution class at runtime?
        # Or inspect local_scope keys (exclude __builtins__ etc).
        
        args = {k: v for k, v in local_scope.items() if not k.startswith('__')}
        
        try:
            # Invoke method
            # We assume method_name is correct from ETL
            method = getattr(sol, '${methodName}', None)
            if not method:
                results.append({'status': 'Method Not Found', 'id': i, 'error': 'Method ${methodName} not found'})
                continue

            # We call with kwargs. This relies on input variables matching arg names.
            # Leetcode questions usually ensure this ("nums = ...").
            
            output = method(**args)
            
            # Compare output
            # We convert output to string to comparison with expected string? 
            # Or assume expected is valid json and parse it?
            # V1: String compare of repr() ?
            # TestSpec output is a string description e.g. "[0,1]".
            # Let's try to parse expected if possible, else compare strings.
            # But [0,1] string vs [0, 1] (spaces) matters.
            # We'll normalize by json.dumps if possible.
            
            actual_str = json.dumps(output, sort_keys=True) if not isinstance(output, (str, int, float, bool, type(None))) else str(output)
            # Remove spaces from actual for fuzzy match?
            
            results.append({
                'status': 'Finished',
                'id': i,
                'actual': actual_str,
                'expected': test.get('expected'),
                'passed': False # Front-end or we verify here?
            })
        except Exception as e:
             results.append({'status': 'Runtime Error', 'id': i, 'error': str(e)})
             import traceback
             results[-1]['trace'] = traceback.format_exc()

    print(json.dumps(results))

if __name__ == '__main__':
    run_tests()
`;
}

function generateJavascriptDriver(userCode: string, methodName: string, samples: any[]) {
    // Similar logic for JS
    const testCasesStr = JSON.stringify(samples.map(s => ({
        input_code: s.input,
        expected: s.output
    })));

    return `
${userCode}

// Driver
(function() {
    const testCases = ${testCasesStr};
    const results = [];
    
    // Finding the function. 
    // If class Solution { ... }, instantiate it.
    // If function twoSum ... 
    // We try to locate '${methodName}'.
    
    let func = null;
    let context = null;

    try {
        if (typeof Solution === 'function') {
            const sol = new Solution();
            if (typeof sol.${methodName} === 'function') {
                func = sol.${methodName};
                context = sol;
            }
        }
        
        if (!func) {
            // Check global scope (in this closure or window/global)
            // But we are in a closure. 
            // In Node/Piston, top level definitions might be visible.
            if (typeof ${methodName} === 'function') {
                func = ${methodName};
            }
        }
    } catch(e) {}
    
    if (!func) {
        console.log(JSON.stringify([{status: 'Setup Error', error: 'Function ${methodName} not found'}]));
        return;
    }

    testCases.forEach((test, i) => {
        try {
            // Replace comma separating assignments with semicolon for JS
            const inputScript = test.input_code.replace(/, (?=[a-zA-Z_]\w*\s*=)/g, '; ');
            
            // Extract keys: simplistic regex to find "var =" 
            const extractKeys = inputScript.match(/([a-zA-Z0-9_]+)\s*=/g) || [];
            const keys = extractKeys.map(k => k.replace('=', '').trim());
            
            const runner = new Function(\`
                \${inputScript};
                return { \${keys.join(', ')} };
            \`);
            
            const argsObj = runner();
            const args = keys.map(k => argsObj[k]);

            const output = func.apply(context, args);
            results.push({
                status: 'Finished',
                id: i,
                actual: JSON.stringify(output),
                expected: test.expected
            });
        } catch(e) {
            results.push({status: 'Runtime Error', id: i, error: e.toString()});
        }
    });
    
    console.log(JSON.stringify(results));
})();
`;
}
