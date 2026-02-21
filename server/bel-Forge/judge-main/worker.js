const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const os = require("os");

const LANGUAGE_CONFIGS = {
    cpp: {
        extension: "cpp",
        compile: (src, out) => `g++ "${src}" -o "${out}"`,
        execute: (out) => `"${out}"`,
    },
    c: {
        extension: "c",
        compile: (src, out) => `gcc "${src}" -o "${out}"`,
        execute: (out) => `"${out}"`,
    },
    python: {
        extension: "py",
        compile: null,
        execute: (src) => `python3 "${src}"`,
    },
    java: {
        extension: "java",
        compile: (src) => `javac "${src}"`,
        execute: (src) => `java -cp "${path.dirname(src)}" ${path.basename(src, ".java")}`,
    }
};

async function executeCode(job) {
    console.log("Worker received job:", job);
    const { code, language, input, timeLimit, memoryLimit } = job;

    if (!LANGUAGE_CONFIGS[language]) {
        return Promise.reject({ error: `Unsupported language: ${language}` });
    }

    const config = LANGUAGE_CONFIGS[language];
    const execDir = path.join(__dirname, "sandbox", `exec-${Date.now()}`);
    fs.mkdirSync(execDir, { recursive: true });

    const sourceFile = path.join(execDir, `code.${config.extension}`);
    const outputFile = path.join(execDir, "code.exe");

    fs.writeFileSync(sourceFile, code);

    return new Promise((resolve, reject) => {
        if (config.compile) {
            exec(config.compile(sourceFile, outputFile), (compileError, compileStdout, compileStderr) => {
                if (compileError) {
                    cleanup(execDir);

                    // Parse compilation error for line numbers
                    const parsedError = parseErrorLocation(compileStderr, language);

                    return reject({
                        error: "COMPILATION_ERROR",
                        message: "Code compilation failed",
                        details: {
                            stderr: compileStderr.trim(),
                            stdout: compileStdout.trim(),
                            exitCode: compileError.code || null,
                            language: language,
                            lineNumber: parsedError?.line || null,
                            column: parsedError?.column || null,
                            parsedError: parsedError
                        }
                    });
                }
                console.log("Compilation Successful!");
                runCode(config.execute(outputFile), execDir, input, timeLimit, memoryLimit, language, resolve, reject);
            });
        } else {
            runCode(config.execute(sourceFile), execDir, input, timeLimit, memoryLimit, language, resolve, reject);
        }
    });
}

function runCode(command, execDir, input, timeLimit, memoryLimit, language, resolve, reject) {
    const startTime = Date.now();

    // For Windows, use spawn to get better control over the process
    const args = command.split(' ');
    const executable = args[0].replace(/"/g, ''); // Remove quotes
    const processArgs = args.slice(1).map(arg => arg.replace(/"/g, ''));

    const childProcess = spawn(executable, processArgs, {
        cwd: execDir,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let killed = false;
    let memoryCheckInterval;
    let peakMemoryKB = 0;

    // Monitor memory usage
    const memoryLimitBytes = memoryLimit * 1024 * 1024;
    memoryCheckInterval = setInterval(() => {
        if (childProcess.pid && !killed) {
            try {
                // Use tasklist to check memory usage on Windows
                exec(`tasklist /FI "PID eq ${childProcess.pid}" /FO CSV`, (err, out) => {
                    if (!err && out) {
                        const lines = out.split('\n');
                        if (lines.length > 1) {
                            const memLine = lines[1].split(',');
                            if (memLine.length > 4) {
                                const memStr = memLine[4].replace(/"/g, '').replace(/,/g, '').replace(' K', '');
                                const memoryUsageBytes = parseInt(memStr, 10) * 1024;
                                const memoryKB = Math.round(memoryUsageBytes / 1024);
                                peakMemoryKB = Math.max(peakMemoryKB, memoryKB);

                                if (memoryUsageBytes > memoryLimitBytes) {
                                    killed = true;
                                    clearInterval(memoryCheckInterval);
                                    childProcess.kill('SIGKILL');
                                    cleanup(execDir);
                                    return reject({
                                        error: "MEMORY_LIMIT_EXCEEDED",
                                        message: `Memory limit of ${memoryLimit}MB exceeded`,
                                        details: {
                                            memoryUsedKB: memoryKB,
                                            memoryLimit: memoryLimit,
                                            executionTimeMs: Date.now() - startTime
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            } catch (e) {
                // Ignore errors in memory checking
            }
        }
    }, 100); // Check every 100ms

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
        if (!killed) {
            killed = true;
            clearInterval(memoryCheckInterval);
            childProcess.kill('SIGKILL');
            cleanup(execDir);
            return reject({
                error: "TIME_LIMIT_EXCEEDED",
                message: `Time limit of ${timeLimit}s exceeded`,
                details: {
                    executionTimeMs: Date.now() - startTime,
                    memoryUsedKB: peakMemoryKB
                }
            });
        }
    }, timeLimit * 1000);

    // Handle process output
    childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    childProcess.on('close', (code, signal) => {
        if (killed) return; // Already handled

        clearTimeout(timeoutHandle);
        clearInterval(memoryCheckInterval);

        const executionTimeMs = Date.now() - startTime;
        cleanup(execDir);

        if (code !== 0) {
            // Error handling logic
            let errorType = "RUNTIME_ERROR";
            let errorMessage = stderr.trim() || `Program exited with code ${code}`;
            let lineNumber = null;
            let column = null;
            let parsedError = null;

            if (signal === 'SIGKILL') {
                errorType = "MEMORY_LIMIT_EXCEEDED";
                errorMessage = "Process was killed (likely memory limit exceeded)";
            } else if (code === 139) {
                errorType = "SEGMENTATION_FAULT";
                errorMessage = "Segmentation fault - invalid memory access";
            } else if (code === 134) {
                errorType = "ABORT_SIGNAL";
                errorMessage = "Program aborted - assertion failure or abort() called";
            } else if (code === 136) {
                errorType = "FLOATING_POINT_ERROR";
                errorMessage = "Floating point exception - division by zero or invalid operation";
            } else if (code === 1) {
                parsedError = parseErrorLocation(stderr, language);
                if (parsedError) {
                    lineNumber = parsedError.line;
                    column = parsedError.column;
                    errorMessage = parsedError.message || errorMessage;
                }
            }

            return reject({
                error: errorType,
                message: errorMessage,
                details: {
                    stderr: stderr.trim(),
                    stdout: stdout.trim(),
                    exitCode: code,
                    signal: signal,
                    executionTimeMs,
                    memoryUsedKB: peakMemoryKB,
                    lineNumber: lineNumber,
                    column: column,
                    parsedError: parsedError
                }
            });
        }

        // Success case
        resolve({
            output: stdout.replace(/\r?\n/g, '\r\n'),
            executionTimeMs,
            memoryUsedKB: peakMemoryKB,
            status: "SUCCESS"
        });
    });

    // Send input if provided
    if (input) {
        childProcess.stdin.write(input);
        childProcess.stdin.end();
    }
}

function cleanup(directory, attempts = 5) {
    setTimeout(() => {
        if (fs.existsSync(directory)) {
            try {
                fs.rmSync(directory, { recursive: true, force: true });
                console.log(`🗑️ Cleaned up: ${directory}`);
            } catch (err) {
                console.error(`Deletion failed (Attempt ${6 - attempts}):`, err);
                if (attempts > 0) setTimeout(() => cleanup(directory, attempts - 1), 1000);
            }
        }
    }, 1000);
}

function parseErrorLocation(stderr, language) {
    // Enhanced parsing logic for different languages and error types
    let lineColPattern, messagePattern, lineNumber, column, message;

    // Language-specific error parsing
    switch (language) {
        case 'cpp':
        case 'c':
            // GCC/G++ error format: filename:line:column: error: message
            // Handle both Windows and Unix paths
            lineColPattern = /(?:.*[\\\/])?code\.[ch](?:pp)?:(\d+):(\d+):\s*(?:error|warning):\s*(.+)/i;
            const gccMatch = stderr.match(lineColPattern);
            if (gccMatch) {
                return {
                    line: parseInt(gccMatch[1], 10),
                    column: parseInt(gccMatch[2], 10),
                    message: gccMatch[3].trim()
                };
            }

            // Alternative GCC format without column
            const gccSimplePattern = /(?:.*[\\\/])?code\.[ch](?:pp)?:(\d+):\s*(?:error|warning):\s*(.+)/i;
            const gccSimpleMatch = stderr.match(gccSimplePattern);
            if (gccSimpleMatch) {
                return {
                    line: parseInt(gccSimpleMatch[1], 10),
                    column: null,
                    message: gccSimpleMatch[2].trim()
                };
            }
            break;

        case 'python':
            // Python error format: File "filename", line N, in function
            const pythonLineMatch = stderr.match(/File ".*?code\.py", line (\d+)/);
            const pythonErrorMatch = stderr.match(/(\w+Error): (.+)/);
            if (pythonLineMatch) {
                return {
                    line: parseInt(pythonLineMatch[1], 10),
                    column: null,
                    message: pythonErrorMatch ? `${pythonErrorMatch[1]}: ${pythonErrorMatch[2]}` : 'Python runtime error'
                };
            }
            break;

        case 'java':
            // Java error format: filename.java:line: error: message
            const javaMatch = stderr.match(/code\.java:(\d+):\s*error:\s*(.+)/i);
            if (javaMatch) {
                return {
                    line: parseInt(javaMatch[1], 10),
                    column: null,
                    message: javaMatch[2].trim()
                };
            }
            // Java runtime exceptions
            const javaRuntimeMatch = stderr.match(/at code\.main\(code\.java:(\d+)\)/);
            const javaExceptionMatch = stderr.match(/Exception in thread "main" (.+)/);
            if (javaRuntimeMatch) {
                return {
                    line: parseInt(javaRuntimeMatch[1], 10),
                    column: null,
                    message: javaExceptionMatch ? javaExceptionMatch[1] : 'Java runtime exception'
                };
            }
            break;
    }

    // Fallback: try generic patterns
    const genericLineColPattern = /:(\d+):(\d+)/;
    const genericMessagePattern = /(?:error|Error):\s*(.+)/i;

    const lineColMatch = stderr.match(genericLineColPattern);
    const messageMatch = stderr.match(genericMessagePattern);

    if (lineColMatch && lineColMatch.length >= 3) {
        return {
            line: parseInt(lineColMatch[1], 10),
            column: parseInt(lineColMatch[2], 10),
            message: messageMatch ? messageMatch[1].trim() : null
        };
    }

    // Try just line number
    const lineOnlyPattern = /line\s+(\d+)/i;
    const lineOnlyMatch = stderr.match(lineOnlyPattern);
    if (lineOnlyMatch) {
        return {
            line: parseInt(lineOnlyMatch[1], 10),
            column: null,
            message: messageMatch ? messageMatch[1].trim() : null
        };
    }

    return null;
}

/**
 * Maps executeCode rejection errors to Submission schema status enums.
 * @param {Object} errorResult - The rejection object from executeCode.
 * @returns {string} One of the status enums: CE, TLE, MLE, RE, IE.
 */
function mapErrorToStatus(errorResult) {
    if (errorResult.error === 'COMPILATION_ERROR') return 'CE';
    if (errorResult.error === 'TIME_LIMIT_EXCEEDED') return 'TLE';
    if (errorResult.error === 'MEMORY_LIMIT_EXCEEDED') return 'MLE';
    if (errorResult.error === 'RUNTIME_ERROR') return 'RE';
    if (errorResult.error === 'SEGMENTATION_FAULT') return 'RE';
    if (errorResult.error === 'ABORT_SIGNAL') return 'RE';
    if (errorResult.error === 'FLOATING_POINT_ERROR') return 'RE';
    return 'IE';
}

/**
 * The default export executed by the Piscina worker thread.
 * Iterates over every test case, executes the user's code with each input,
 * compares stdout against the expected output, and returns the first failing verdict.
 * If all test cases pass, returns AC.
 *
 * @param {Object} payload - The structured clone payload from the main thread.
 * @param {string} payload.submissionId - MongoDB _id of the Submission document.
 * @param {string} payload.code - User's source code.
 * @param {string} payload.language - One of: cpp, c, python, java, javascript.
 * @param {number} payload.timeLimit - Time limit in milliseconds.
 * @param {number} payload.memoryLimit - Memory limit in KB.
 * @param {Array<{input: string, output: string}>} payload.testCases - Problem test cases.
 * @returns {Object} Strictly formatted result matching the Submission schema.
 */
module.exports = async (payload) => {
    const { submissionId, code, language, timeLimit, memoryLimit, testCases } = payload;

    // Fallback: if no test cases provided, run once with empty input (backwards-compat)
    const cases = testCases && testCases.length > 0
        ? testCases
        : [{ input: '', output: '' }];

    const timeLimitSec = (timeLimit || 2000) / 1000;   // executeCode expects seconds
    const memLimitMB = (memoryLimit || 256000) / 1024; // executeCode expects MB

    let maxTime = 0;
    let maxMemory = 0;

    for (let i = 0; i < cases.length; i++) {
        const testInput = cases[i].input || '';
        const expectedOut = cases[i].output || '';

        try {
            const result = await executeCode({
                code,
                language,
                input: testInput,
                timeLimit: timeLimitSec,
                memoryLimit: memLimitMB,
            });

            const actualOut = (result.output || '').replace(/\r\n/g, '\n').trim().split('\n').map(l => l.trimEnd()).join('\n');
            const expected = expectedOut.replace(/\r\n/g, '\n').trim().split('\n').map(l => l.trimEnd()).join('\n');

            const elapsedMs = result.executionTimeMs ?? 0;
            const memoryKB = result.memoryUsedKB ?? 0;
            maxTime = Math.max(maxTime, elapsedMs);
            maxMemory = Math.max(maxMemory, memoryKB);

            // ——— THE CRITICAL COMPARISON ———
            if (actualOut !== expected) {
                return {
                    submissionId,
                    status: 'WA',
                    executionTime: elapsedMs,
                    memoryUsed: memoryKB,
                    failedTestCase: i,
                    logs: {
                        stdout: actualOut.substring(0, 2048),
                        stderr: '',
                    },
                };
            }

        } catch (errorResult) {
            const details = errorResult.details || {};
            const elapsedMs = details.executionTimeMs ?? 0;
            const memoryKB = details.memoryUsedKB ?? 0;

            return {
                submissionId,
                status: mapErrorToStatus(errorResult),
                executionTime: elapsedMs,
                memoryUsed: memoryKB,
                failedTestCase: i,
                logs: {
                    stdout: (details.stdout || '').substring(0, 2048),
                    stderr: (details.stderr || errorResult.message || '').substring(0, 2048),
                },
            };
        }
    }

    // All test cases passed
    return {
        submissionId,
        status: 'AC',
        executionTime: maxTime,
        memoryUsed: maxMemory,
        failedTestCase: null,
        logs: { stdout: '', stderr: '' },
    };
};