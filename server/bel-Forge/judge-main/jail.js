/**
 * jail.js — Sandboxed JavaScript Executor
 *
 * Spawned as a child process by worker.js. Executes user-submitted JavaScript
 * inside a stripped vm context with no access to Node.js internals.
 *
 * Usage:  node --max-old-space-size=256 jail.js <sourceFile>
 *         Stdin: test-case input string
 *         Stdout: captured console.log output
 *         Stderr: JSON error object on failure
 *
 * Security layers:
 *   1. vm.createContext() — stripped V8 context (no require, process, fs, etc.)
 *   2. child_process isolation — separate V8 engine instance (prototype pollution safe)
 *   3. env: {} at spawn site — no env var leakage
 *   4. --max-old-space-size=256 — V8 heap cap
 *   5. vm timeout — synchronous CPU cap
 *   6. No async APIs — setTimeout/setInterval/setImmediate stripped
 */

'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

// ── Parse arguments ──────────────────────────────────────────────────
const sourceFile = process.argv[2];
if (!sourceFile) {
    process.stderr.write(JSON.stringify({ error: 'NO_SOURCE', message: 'No source file provided' }));
    process.exit(1);
}

// Read source code
let userCode;
try {
    userCode = fs.readFileSync(sourceFile, 'utf8');
} catch (err) {
    process.stderr.write(JSON.stringify({ error: 'READ_FAILED', message: err.message }));
    process.exit(1);
}

// Read all stdin synchronously (test-case input)
let stdinData = '';
try {
    stdinData = fs.readFileSync(0, 'utf8'); // fd 0 = stdin
} catch (e) {
    // No stdin provided — that's fine for problems with no input
}

// ── Build the sandboxed I/O layer ────────────────────────────────────

const MAX_OUTPUT_BYTES = 65536; // 64KB stdout cap
let capturedStdout = '';
let outputLimitHit = false;

/**
 * Fake console — intercepts log/warn/error and appends to capturedStdout.
 * Mimics Node's console.log behavior (space-separated args + newline).
 */
const fakeConsole = {
    log: (...args) => {
        if (outputLimitHit) return;
        const line = args.map(a => {
            if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch { return String(a); }
            }
            return String(a);
        }).join(' ') + '\n';
        capturedStdout += line;
        if (capturedStdout.length > MAX_OUTPUT_BYTES) {
            outputLimitHit = true;
        }
    },
    warn: (...args) => fakeConsole.log(...args),
    error: (...args) => fakeConsole.log(...args),
    info: (...args) => fakeConsole.log(...args),
    debug: () => { },    // suppressed
    trace: () => { },    // suppressed
    dir: (obj) => fakeConsole.log(obj),
    assert: (cond, ...args) => { if (!cond) fakeConsole.error('Assertion failed:', ...args); },
};

/**
 * Fake readline — provides a synchronous line reader from the stdin input.
 * Competitive programming JS typically uses:
 *   const lines = require('readline')... or reads process.stdin
 * We provide a simpler lines() iterator approach.
 */
const inputLines = stdinData.split('\n');
let inputLineIndex = 0;

const fakeReadline = {
    /**
     * Returns the next line from stdin input, or '' if exhausted.
     */
    nextLine: () => {
        if (inputLineIndex < inputLines.length) {
            return inputLines[inputLineIndex++].replace(/\r$/, '');
        }
        return '';
    },
    /**
     * Returns all remaining lines as an array.
     */
    allLines: () => {
        const rest = inputLines.slice(inputLineIndex).map(l => l.replace(/\r$/, ''));
        inputLineIndex = inputLines.length;
        return rest;
    },
    /**
     * Returns the entire stdin input as a single string.
     */
    raw: () => stdinData,
};

// ── Build the stripped V8 context ────────────────────────────────────

const sandbox = {
    // Allowed globals for competitive programming
    console: fakeConsole,
    input: fakeReadline,         // input.nextLine(), input.allLines(), input.raw()
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    Map: Map,
    Set: Set,
    WeakMap: WeakMap,
    WeakSet: WeakSet,
    Symbol: Symbol,
    RegExp: RegExp,
    Date: Date,
    JSON: JSON,
    Error: Error,
    TypeError: TypeError,
    RangeError: RangeError,
    ReferenceError: ReferenceError,
    SyntaxError: SyntaxError,
    URIError: URIError,
    EvalError: EvalError,
    Promise: undefined,          // No async — synchronous only
    BigInt: typeof BigInt !== 'undefined' ? BigInt : undefined,

    // ── Explicitly BLOCKED ──────────────────────────────────────────
    require: undefined,
    process: undefined,
    global: undefined,
    globalThis: undefined,
    module: undefined,
    exports: undefined,
    __dirname: undefined,
    __filename: undefined,
    Buffer: undefined,
    setTimeout: undefined,
    setInterval: undefined,
    setImmediate: undefined,
    clearTimeout: undefined,
    clearInterval: undefined,
    clearImmediate: undefined,
    queueMicrotask: undefined,
    eval: undefined,
    Function: undefined,        // Prevents `new Function('return process')()`
};

// Create the isolated V8 context
vm.createContext(sandbox);

// ── Execute ──────────────────────────────────────────────────────────

// Default timeout: 5000ms (the parent process also has a SIGKILL backup timer)
const TIMEOUT_MS = parseInt(process.argv[3], 10) || 5000;

try {
    const script = new vm.Script(userCode, {
        filename: 'user_code.js',
        timeout: TIMEOUT_MS,
    });

    script.runInContext(sandbox, {
        timeout: TIMEOUT_MS,
        breakOnSigint: true,
    });

    // Check if output limit was hit
    if (outputLimitHit) {
        process.stderr.write(JSON.stringify({
            error: 'OUTPUT_LIMIT_EXCEEDED',
            message: 'Output exceeded 64KB limit',
        }));
        process.exit(1);
    }

    // Write captured stdout to actual stdout for the parent to read
    process.stdout.write(capturedStdout);
    process.exit(0);

} catch (err) {
    if (err.message && err.message.includes('Script execution timed out')) {
        process.stderr.write(JSON.stringify({
            error: 'TIME_LIMIT_EXCEEDED',
            message: `Execution timed out after ${TIMEOUT_MS}ms`,
        }));
        process.exit(2); // Special exit code for TLE
    }

    // Generic runtime error
    process.stderr.write(JSON.stringify({
        error: 'RUNTIME_ERROR',
        message: err.message || String(err),
        stack: (err.stack || '').split('\n').slice(0, 5).join('\n'),
    }));
    process.exit(1);
}
