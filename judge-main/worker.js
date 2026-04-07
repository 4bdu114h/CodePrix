const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { exec } = require("child_process");

const PYTHON_CMD = os.platform() === "win32" ? "python" : "python3";

const LANGUAGE_CONFIGS = {
  cpp: {
    extension: "cpp",
    compile: (src, out) => `g++ "${src}" -o "${out}"`,
    run: (src, out) => `"${out}"`,
  },
  c: {
    extension: "c",
    compile: (src, out) => `gcc "${src}" -o "${out}"`,
    run: (src, out) => `"${out}"`,
  },
  python: {
    extension: "py",
    compile: null,
    run: (src) => `${PYTHON_CMD} "${src}"`,
  },
  java: {
    extension: "java",
    compile: (src) => `javac "${src}"`,
    run: (src) => `java -cp "${path.dirname(src)}" Main`,
  },
};

function runExec(cmd, cwd, stdin, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = exec(cmd, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return reject({ error, stdout, stderr });
      }
      resolve({ stdout, stderr });
    });

    if (stdin && p.stdin) {
      p.stdin.write(stdin);
      p.stdin.end();
    }
  });
}

module.exports = async function executeJob(job) {
  const started = Date.now();
  const { code, language, input = "", timeLimit = 2 } = job;
  const cfg = LANGUAGE_CONFIGS[language];

  if (!cfg) {
    return { success: false, error: "UNSUPPORTED_LANGUAGE", message: `Unsupported language: ${language}`, details: {}, timeTaken: "0ms" };
  }

  const workDir = path.join(__dirname, "sandbox", `exec-${crypto.randomUUID()}`);
  fs.mkdirSync(workDir, { recursive: true });

  const source = path.join(workDir, language === "java" ? "Main.java" : `code.${cfg.extension}`);
  const bin = path.join(workDir, process.platform === "win32" ? "code.exe" : "code.out");
  fs.writeFileSync(source, code, "utf8");

  try {
    if (cfg.compile) {
      try {
        await runExec(cfg.compile(source, bin), workDir, "", Math.max(1000, timeLimit * 1000));
      } catch (err) {
        return {
          success: false,
          error: "COMPILATION_ERROR",
          message: "Code compilation failed",
          details: { stderr: (err.stderr || "").toString(), stdout: (err.stdout || "").toString() },
          timeTaken: `${Date.now() - started}ms`,
        };
      }
    }

    const timeoutMs = Math.max(1000, timeLimit * 1000);
    const { stdout, stderr } = await runExec(cfg.run(source, bin), workDir, input, timeoutMs);

    if (stderr && stderr.trim().length > 0) {
      return {
        success: false,
        error: "RUNTIME_ERROR",
        message: "Program exited with stderr",
        details: { stderr },
        timeTaken: `${Date.now() - started}ms`,
      };
    }

    return {
      success: true,
      output: (stdout || "").replace(/\n/g, "\r\n"),
      timeTaken: `${Date.now() - started}ms`,
      status: "SUCCESS",
    };
  } catch (err) {
    const timedOut = String(err?.error?.killed || "") === "true" || String(err?.error?.signal || "") === "SIGTERM";
    return {
      success: false,
      error: timedOut ? "TIME_LIMIT_EXCEEDED" : "RUNTIME_ERROR",
      message: timedOut ? "Execution timed out" : "Execution failed",
      details: { stderr: (err.stderr || err.error?.message || "").toString(), stdout: (err.stdout || "").toString() },
      timeTaken: `${Date.now() - started}ms`,
    };
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
  }
};
