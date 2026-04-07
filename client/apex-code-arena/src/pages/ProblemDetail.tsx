import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ChevronDown, Terminal, CheckCircle2, XCircle, AlertTriangle, Zap, Eye, Code2, NotebookPen, ChevronLeft, Clock, Loader2, Timer, MemoryStick } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CheckeredFlag } from "@/components/RacingElements";
import PitCrewAI from "@/components/PitCrewAI";
import apiClient from "@/lib/apiClient";
import { encodeSourceCode, LANG_MAP } from "@/lib/submissionCodec";
import { useToast } from "@/hooks/use-toast";
import { useSubmissionStatus } from "@/hooks/useSubmissionStatus";
import type { SubmissionStatus } from "@/hooks/useSubmissionStatus";

const languages = ["C++", "Python", "Java"];

const defaultCode: Record<string, string> = {
  "C++": `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Read input and solve the problem
    
    return 0;
}`,
  Python: `import sys

def solve():
    # Read input and solve the problem
    pass

solve()`,
  Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Read input and solve the problem
        
    }
}`,
};

type SubmissionState = "idle" | "running" | "accepted" | "wrong" | "error" | "pending";
type RunState = "idle" | "running" | "success" | "error";

/** Human-readable labels for system/syntax failure statuses */
const STATUS_LABELS: Partial<Record<SubmissionStatus, string>> = {
  CE: "Compilation Error",
  RE: "Runtime Error",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  IE: "Internal Error",
};

interface ProblemFromApi {
  _id: string;
  problemId?: number;
  title: string;
  slug?: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category?: string;
  tags?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  hints?: string[];
  starterCode?: Record<string, string>;
  solutionCode?: Record<string, string>;
  solutionExplanation?: string;
  testCases?: { input: string; output: string }[];
  timeLimit?: string;
  memoryLimit?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

/** Map API problem to display shape */
function toDisplayProblem(p: ProblemFromApi) {
  const displayId = p.problemId ?? p._id;
  return {
    id: displayId,
    _id: p._id,
    title: p.title,
    description: p.description,
    difficulty: p.difficulty,
    category: p.category,
    tags: p.tags,
    examples: p.examples ?? (p.testCases ?? []).map((tc) => ({ input: tc.input, output: tc.output })),
    constraints: p.constraints ?? [],
    hints: p.hints ?? [],
    starterCode: p.starterCode ?? null,
    solutionCode: p.solutionCode ?? null,
    solutionExplanation: p.solutionExplanation ?? null,
    timeComplexity: p.timeComplexity,
    spaceComplexity: p.spaceComplexity,
  };
}

const ProblemDetail = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState<ReturnType<typeof toDisplayProblem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid problem ID");
      return;
    }
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get<ProblemFromApi>(`/problems/${id}`);
        setProblem(toDisplayProblem(data));
        setError(null);
      } catch {
        setError("Problem not found");
        setProblem(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id]);

  const [lang, setLang] = useState("C++");
  const [code, setCode] = useState(() => {
    // Try to load saved code from localStorage on initial render
    const savedCode = localStorage.getItem(`codeprix-code-${id}-C++`);
    return savedCode || defaultCode["C++"];
  });
  const [state, setState] = useState<SubmissionState>("idle");
  const [runState, setRunState] = useState<RunState>("idle");
  const [runOutput, setRunOutput] = useState<string>("");
  const [runExpectedOutput, setRunExpectedOutput] = useState<string>("");
  const [langOpen, setLangOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem(`codeprix-notes-${id}`);
    return savedNotes || "";
  });
  const [notesOpen, setNotesOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(() => {
    const savedTime = localStorage.getItem(`codeprix-timer-${id}`);
    return savedTime ? parseInt(savedTime, 10) : 0;
  });
  const [timerOpen, setTimerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const { toast } = useToast();

  // ── Polling Engine ───────────────────────────────────────────────
  const { submission: polledSubmission, isPolling, error: pollingError } =
    useSubmissionStatus(submissionId);

  // Diagnostics extracted from the final submission payload
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);
  const [failedTestCase, setFailedTestCase] = useState<number | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string>("");
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<SubmissionStatus | null>(null);

  const handleSubmit = async () => {
    if (submitting) return; // Prevent rapid-fire duplicates
    setSubmitting(true);
    setState("running");
    setRunState("idle");
    setRunOutput("");

    try {
      // 1. Unicode-safe Base64 encode
      const encodedCode = encodeSourceCode(code);

      // 2. Dispatch to backend via Axios singleton (JWT auto-attached)
      const res = await apiClient.post("/submissions", {
        code: encodedCode,
        problemId: id,
        language: LANG_MAP[lang] || lang.toLowerCase(),
      });

      // 3. 202 Accepted — store submissionId, transition to pending
      setSubmissionId(res.data.submissionId);
      setState("pending");
      toast({
        title: "Submission Enqueued",
        description: `ID: ${res.data.submissionId} — judging in progress.`,
      });
    } catch (err: any) {
      setState("error");
      const message = err.response?.data?.error || err.message || "Submission failed.";
      setRunOutput(message);
      toast({ title: "Submission Failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submission Status Reactor ────────────────────────────────────
  // Maps polled backend state → UI state machine
  useEffect(() => {
    if (!polledSubmission) return;

    const s = polledSubmission.status;

    if (s === "PEND" || s === "RUN") {
      setState("pending");
      return;
    }

    // Terminal state reached — commit diagnostics
    if (s === "AC") {
      setState("accepted");
      setExecTimeMs(polledSubmission.metrics?.time ?? null);
      setMemoryMb(polledSubmission.metrics?.memory ?? null);
    } else if (s === "WA") {
      setState("wrong");
      setFailedTestCase(polledSubmission.failedTestCase ?? null);
    } else {
      // CE, RE, TLE, MLE, IE
      setState("error");
      setLastSubmissionStatus(s);
      setTerminalLogs(
        polledSubmission.logs?.stderr ||
        polledSubmission.logs?.stdout ||
        `${STATUS_LABELS[s] || s}: No additional output.`
      );
    }

    // Reset submissionId so hook goes dormant
    setSubmissionId(null);
    setRunOutput("");
  }, [polledSubmission]);

  // Surface polling errors to the console
  useEffect(() => {
    if (pollingError) {
      setState("error");
      setTerminalLogs(`Polling Error: ${pollingError}`);
      setSubmissionId(null);
    }
  }, [pollingError]);

  const handleRun = async () => {
    setRunState("running");
    setState("idle");
    setRunOutput("");
    setRunExpectedOutput("");
    const firstExample = problem.examples?.[0];
    const sampleInput = firstExample?.input ?? "";
    const expectedOutput = firstExample?.output ?? "";
    try {
      const encodedCode = encodeSourceCode(code);
      const res = await apiClient.post("/submissions/run", {
        code: encodedCode,
        language: LANG_MAP[lang] || lang.toLowerCase(),
        input: sampleInput,
        expectedOutput,
      });
      const data = res.data;
      const out = [data.stdout, data.stderr].filter(Boolean).join("\n");
      const timeMsg = data.executionTimeMs != null ? `\n(${data.executionTimeMs} ms)` : "";
      setRunExpectedOutput(typeof data.expectedOutput === "string" ? data.expectedOutput : "");
      if (data.success && data.status === "OK") {
        setRunState("success");
        setRunOutput(out ? out + timeMsg : "(no output)" + timeMsg);
      } else {
        setRunState("error");
        setRunOutput(out || `${data.status || "Error"}` + timeMsg);
      }
    } catch (err: any) {
      setRunState("error");
      const message = err.response?.data?.error || err.message || "Run failed.";
      setRunOutput(message);
      setRunExpectedOutput("");
      toast({ title: "Run Failed", description: message, variant: "destructive" });
    }
  };

  // Resolve the starter code for a language: DB starterCode > generic default
  const getStarterCode = (l: string) => {
    if (problem?.starterCode?.[l]) return problem.starterCode[l];
    const altKey = l === "C++" ? "cpp" : l.toLowerCase();
    if (problem?.starterCode?.[altKey]) return problem.starterCode[altKey];
    return defaultCode[l] ?? "";
  };

  // Resolve the solution code for a language from DB
  const getSolutionCode = (l: string): string | null => {
    if (problem?.solutionCode?.[l]) return problem.solutionCode[l];
    const altKey = l === "C++" ? "cpp" : l.toLowerCase();
    if (problem?.solutionCode?.[altKey]) return problem.solutionCode[altKey];
    return null;
  };

  const handleLangChange = (l: string) => {
    setLang(l);
    const savedCode = localStorage.getItem(`codeprix-code-${id}-${l}`);
    setCode(savedCode || getStarterCode(l));
    setLangOpen(false);
  };

  // Load saved code when component mounts or problem/language changes
  useEffect(() => {
    const codeKey = `codeprix-code-${id}-${lang}`;
    const savedCode = localStorage.getItem(codeKey);

    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(getStarterCode(lang));
    }

    // Reset states when switching problems (prevents stale result from previous problem)
    setState("idle");
    setRunState("idle");
    setRunOutput("");
    setRunExpectedOutput("");
    setSubmissionId(null);
    setExecTimeMs(null);
    setMemoryMb(null);
    setFailedTestCase(null);
    setTerminalLogs("");
    setLastSubmissionStatus(null);
    setShowSolution(false);
    setSubmitting(false);
    setSavedIndicator(false);
  }, [id, lang]); // Run when problem ID or language changes

  // Auto-save code to localStorage whenever it changes
  useEffect(() => {
    if (code && code !== defaultCode[lang]) {
      const codeKey = `codeprix-code-${id}-${lang}`;
      localStorage.setItem(codeKey, code);

      // Show saved indicator briefly
      setSavedIndicator(true);
      const timer = setTimeout(() => setSavedIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [code, id, lang]);

  // Auto-save notes to localStorage whenever they change
  useEffect(() => {
    const notesKey = `codeprix-notes-${id}`;
    localStorage.setItem(notesKey, notes);
  }, [notes, id]);

  // Timer management - increment every second and save to localStorage
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;
        localStorage.setItem(`codeprix-timer-${id}`, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [id]);

  // Reset timer for current problem
  const handleResetTimer = () => {
    setElapsedTime(0);
    localStorage.setItem(`codeprix-timer-${id}`, "0");
  };

  // Format seconds to MM:SS or HH:MM:SS format
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading / error states
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading problem...</span>
        </main>
      </div>
    );
  }
  if (error || !problem) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 flex items-center justify-center text-destructive font-body">
          {error ?? "Problem not found"}
        </main>
      </div>
    );
  }

  const diffBadge = problem.difficulty === "Easy"
    ? "bg-secondary text-secondary-foreground"
    : problem.difficulty === "Medium"
      ? "bg-steel-blue text-primary-foreground"
      : "bg-primary text-primary-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 h-screen flex flex-col">
        <CheckeredFlag />
        <div className="flex-1 grid md:grid-cols-2 overflow-hidden">
          {/* Left: Problem */}
          <div className="border-r-2 border-foreground overflow-y-auto p-6 bg-card flex flex-col min-h-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ willChange: "opacity" }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display text-xs text-muted-foreground font-bold">#{problem.id}</span>
                <h1 className="font-display text-xl font-bold">{problem.title}</h1>
                <span className={`neo-badge text-[10px] ${diffBadge} border-foreground`}>
                  {problem.difficulty}
                </span>
                <button
                  onClick={() => setNotesOpen(!notesOpen)}
                  className={`px-3 py-1 text-[10px] flex items-center gap-1.5 border-2 border-foreground font-bold transition-colors flex-shrink-0 ${notesOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-primary/20"
                    }`}
                  style={{ boxShadow: "var(--shadow-brutal)" }}
                  title="Add personal notes"
                >
                  <NotebookPen className="h-3 w-3" />
                  NOTES
                </button>
                <button
                  onClick={() => setTimerOpen(!timerOpen)}
                  className={`px-3 py-1 text-[10px] flex items-center gap-1.5 border-2 border-foreground font-bold transition-colors flex-shrink-0 ${timerOpen
                    ? "bg-steel-blue text-primary-foreground"
                    : "bg-background text-foreground hover:bg-steel-blue/20"
                    }`}
                  style={{ boxShadow: "var(--shadow-brutal)" }}
                  title="Time spent on this problem"
                >
                  <Clock className="h-3 w-3" />
                  TIMER
                </button>
              </div>

              <div className="font-body text-sm leading-relaxed text-foreground">
                <p className="mb-4 whitespace-pre-wrap">
                  {problem.description.split(/(`[^`]+`)/g).map((part, i) =>
                    part.startsWith("`") && part.endsWith("`") ? (
                      <code key={i} className="neo-badge bg-secondary text-secondary-foreground text-[10px] px-1 py-0">
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      part
                    )
                  )}
                </p>

                {problem.examples && problem.examples.length > 0 && (
                  <div style={{ willChange: "auto" }}>
                    <h3 className="font-display text-sm font-bold mt-6 mb-2">Examples:</h3>
                    {problem.examples.map((ex, idx) => (
                      <div key={idx} className="border-2 border-foreground bg-background p-4 font-mono text-xs mb-4 overflow-hidden" style={{ boxShadow: "var(--shadow-brutal)" }}>
                        <p className="break-all"><span className="font-bold">Input:</span> {ex.input.replace(/\n/g, " ")}</p>
                        <p className="break-all"><span className="font-bold">Output:</span> {ex.output}</p>
                        {ex.explanation && <p><span className="font-bold">Explanation:</span> {ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {problem.constraints && problem.constraints.length > 0 && (
                  <>
                    <h3 className="font-display text-sm font-bold mt-6 mb-2">Constraints:</h3>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {problem.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </motion.div>

            {/* Panels Container - Notes & Timer Below Problem Description */}
            <div className="mt-6 border-t-2 border-foreground pt-6">
              <div className="flex gap-6">
                {/* Notes Panel - Collapsible */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: notesOpen ? 1 : 0,
                    height: notesOpen ? "auto" : 0,
                  }}
                  transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden flex-1"
                  style={{ willChange: "height, opacity" }}
                >
                  <div className="border-2 border-foreground bg-background flex flex-col" style={{ boxShadow: "var(--shadow-brutal)", minHeight: "300px" }}>
                    {/* Notes Header */}
                    <div className="border-b-2 border-foreground px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <NotebookPen className="h-4 w-4" />
                        <span className="font-display text-xs font-bold uppercase">Notes</span>
                      </div>
                      <span className="font-body text-[10px] text-primary-foreground/70">
                        {notes.length || 0} chars
                      </span>
                    </div>

                    {/* Notes Textarea */}
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add personal notes, hints, or solutions here..."
                      className="flex-1 resize-none bg-background p-4 font-body text-xs text-foreground focus:outline-none border-none placeholder-muted-foreground"
                      spellCheck={false}
                    />

                    {/* Notes Footer */}
                    <div className="border-t-2 border-foreground px-4 py-2 bg-card text-[10px] text-muted-foreground flex-shrink-0">
                      Auto-saved to browser
                    </div>
                  </div>
                </motion.div>

                {/* Timer Panel - Collapsible */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: timerOpen ? 1 : 0,
                    height: timerOpen ? "auto" : 0,
                  }}
                  transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden flex-1"
                  style={{ willChange: "height, opacity" }}
                >
                  <div className="border-2 border-foreground bg-background flex flex-col" style={{ boxShadow: "var(--shadow-brutal)", minHeight: "300px" }}>
                    {/* Timer Header */}
                    <div className="border-b-2 border-foreground px-4 py-3 bg-steel-blue text-primary-foreground flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-display text-xs font-bold uppercase">Timer</span>
                      </div>
                      <button
                        onClick={handleResetTimer}
                        className="text-[10px] font-bold text-primary-foreground hover:text-black transition-colors underline"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Timer Display */}
                    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
                      <div className="font-mono text-5xl font-bold text-foreground mb-4">
                        {formatTime(elapsedTime)}
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-3 bg-secondary border-2 border-foreground mb-6 overflow-hidden" style={{ boxShadow: "var(--shadow-brutal)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min((elapsedTime % 3600) / 36, 100)}%`,
                          }}
                          transition={{ type: "linear" }}
                          className="h-full bg-steel-blue"
                        />
                      </div>

                      {/* Time Info */}
                      <div className="text-[10px] text-muted-foreground font-body text-center space-y-2">
                        <p>Time accumulates while</p>
                        <p>you work on this problem</p>
                        <p className="pt-2 border-t border-foreground mt-2">Saved locally</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2 bg-card">
              <div className="flex items-center gap-3">
                <span className="font-display text-xs text-muted-foreground font-bold shrink-0">
                  #{problem.id}
                </span>
                <span className="font-body text-xs font-bold text-foreground truncate max-w-[150px]" title={problem.title}>
                  {problem.title}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setLangOpen(!langOpen)}
                    className="neo-badge cursor-pointer bg-background flex items-center gap-2"
                  >
                    {lang} <ChevronDown className="h-3 w-3" />
                  </button>
                  {langOpen && (
                    <div className="absolute top-full left-0 mt-1 border-2 border-foreground bg-background z-10" style={{ boxShadow: "var(--shadow-brutal)" }}>
                      {languages.map((l) => (
                        <button
                          key={l}
                          onClick={() => handleLangChange(l)}
                          className="block w-full px-4 py-2 text-left font-body text-xs font-bold hover:bg-secondary transition-colors border-b border-foreground last:border-b-0"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {savedIndicator && (
                  <motion.span
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground font-body flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAiOpen(!aiOpen)}
                  className="neo-btn-yellow px-5 py-2 text-xs flex items-center gap-2"
                >
                  <Zap className="h-3.5 w-3.5" />
                  PIT CREW AI
                </button>
                <button
                  onClick={handleRun}
                  disabled={runState === "running"}
                  className="px-5 py-2 text-xs flex items-center gap-2 border-2 border-foreground font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                  style={{ boxShadow: "var(--shadow-brutal)" }}
                >
                  <Code2 className="h-3 w-3" />
                  {runState === "running" ? "⚙️ RUNNING..." : "▶ RUN"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || state === "running" || state === "pending"}
                  className="neo-btn-primary px-5 py-2 text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting || state === "running" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {submitting || state === "running"
                    ? "🔧 Pit Stop..."
                    : state === "pending"
                      ? "⏳ Judging..."
                      : "🏁 Submit"}
                </button>
                {getSolutionCode(lang) && (
                  <button
                    onClick={() => setShowSolution(!showSolution)}
                    className={`px-5 py-2 text-xs flex items-center gap-2 border-2 border-foreground font-bold transition-colors ${showSolution
                      ? "bg-secondary text-foreground"
                      : "bg-background text-foreground hover:bg-secondary/30"
                      }`}
                    style={{ boxShadow: "var(--shadow-brutal)" }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {showSolution ? "HIDE SOLUTION" : "SEE SOLUTION"}
                  </button>
                )}
              </div>
            </div>

            {/* Code Area + Notes Panel */}
            <div className="flex-1 flex overflow-hidden gap-0">
              {/* Code Editor Section */}
              <div className="flex flex-col overflow-hidden flex-1">
                {/* Code Area */}
                <div className="flex-1 overflow-hidden">
                  <textarea
                    value={showSolution ? (getSolutionCode(lang) ?? code) : code}
                    onChange={(e) => !showSolution && !submitting && setCode(e.target.value)}
                    className={`w-full h-full resize-none bg-background p-4 font-mono text-sm text-foreground focus:outline-none border-none disabled:opacity-80 ${showSolution ? "solution-view" : ""
                      }`}
                    spellCheck={false}
                    disabled={showSolution || submitting}
                    readOnly={state === "pending" || isPolling}
                  />
                </div>

                {/* Output Console */}
                <div className={`border-t-2 border-foreground p-4 min-h-[120px] max-h-[200px] overflow-y-auto ${state === "accepted" ? "bg-neo-green/20" :
                  state === "wrong" ? "bg-primary/10" :
                    state === "error" ? "bg-secondary/30" :
                      runState === "success" ? "bg-accent/20" :
                        runState === "error" ? "bg-destructive/10" :
                          "bg-card"
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="h-4 w-4" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {runState !== "idle" ? "Code Output" : "Race Control"}
                    </span>
                  </div>

                  {/* Run Output */}
                  {runState === "running" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-accent border-2 border-foreground animate-pulse-glow" />
                      <span className="font-mono text-xs font-bold">⚙️ Running code...</span>
                    </motion.div>
                  )}
                  {runState === "success" && (runOutput || runExpectedOutput !== "") && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                        <span className="font-body text-xs font-bold">✅ Code executed successfully</span>
                      </div>
                      <div className={runExpectedOutput ? "grid grid-cols-1 md:grid-cols-2 gap-3" : ""}>
                        <div>
                          <span className="font-display text-[10px] font-bold uppercase text-muted-foreground">Your Output</span>
                          <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap mt-1">
                            {runOutput || "(no output)"}
                          </pre>
                        </div>
                        {runExpectedOutput ? (
                          <div>
                            <span className="font-display text-[10px] font-bold uppercase text-muted-foreground">Expected Output</span>
                            <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap mt-1">
                              {runExpectedOutput}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                  {runState === "error" && runOutput && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-body text-xs font-bold text-destructive">❌ Run failed</span>
                      </div>
                      <div className={runExpectedOutput ? "grid grid-cols-1 md:grid-cols-2 gap-3" : ""}>
                        <div>
                          <span className="font-display text-[10px] font-bold uppercase text-muted-foreground">Your Output</span>
                          <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap mt-1 text-destructive">
                            {runOutput}
                          </pre>
                        </div>
                        {runExpectedOutput ? (
                          <div>
                            <span className="font-display text-[10px] font-bold uppercase text-muted-foreground">Expected Output</span>
                            <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap mt-1">
                              {runExpectedOutput}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}

                  {/* Submission Results */}
                  {runState === "idle" && state === "idle" && (
                    <p className="font-mono text-xs text-muted-foreground">Run your code to see output or Submit to test against all cases...</p>
                  )}
                  {runState === "idle" && state === "running" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-secondary border-2 border-foreground animate-pulse-glow" />
                      <span className="font-mono text-xs font-bold">🔧 Submitting to pit lane...</span>
                    </motion.div>
                  )}
                  {/* ── PENDING: Polling in progress ─────────────── */}
                  {runState === "idle" && state === "pending" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="font-mono text-xs font-bold">
                          ⏳ {polledSubmission?.status === "RUN" ? "Executing on sandbox..." : "Submission enqueued — judging in progress"}
                          {submissionId ? ` (${submissionId})` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary border border-foreground overflow-hidden">
                        <motion.div
                          className="h-full bg-steel-blue"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          style={{ width: "40%" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* ── ACCEPTED: Green success banner with metrics ── */}
                  {runState === "idle" && state === "accepted" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 border-2 border-foreground bg-neo-green/30 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                        <CheckCircle2 className="h-5 w-5 text-foreground" />
                        <span className="font-display text-sm font-bold">✅ ACCEPTED</span>
                      </div>
                      <div className="flex gap-4 font-mono text-xs">
                        {execTimeMs !== null && (
                          <div className="flex items-center gap-1.5 border-2 border-foreground bg-background px-3 py-1.5" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <Clock className="h-3 w-3" />
                            <span className="font-bold">{execTimeMs} ms</span>
                          </div>
                        )}
                        {memoryMb !== null && (
                          <div className="flex items-center gap-1.5 border-2 border-foreground bg-background px-3 py-1.5" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <Zap className="h-3 w-3" />
                            <span className="font-bold">{(memoryMb / 1024).toFixed(2)} MB</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ── WRONG ANSWER: Red banner with failed test index ── */}
                  {runState === "idle" && state === "wrong" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 border-2 border-foreground bg-primary/20 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                        <XCircle className="h-5 w-5 text-primary" />
                        <span className="font-display text-sm font-bold text-primary">❌ WRONG ANSWER</span>
                      </div>
                      {failedTestCase !== null && (
                        <div className="font-mono text-xs border-2 border-foreground bg-background px-3 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                          Failed at Test Case <span className="font-bold text-primary">#{failedTestCase}</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── Console state machine: CE, RE, TLE, MLE, IE (and generic error) ── */}
                  {runState === "idle" && state === "error" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-2"
                    >
                      {lastSubmissionStatus === "CE" && (
                        <>
                          <div className="flex items-center gap-2 border-2 border-foreground bg-destructive/20 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <span className="font-display text-sm font-bold text-destructive">Compilation Error</span>
                          </div>
                          <p className="font-body text-xs text-muted-foreground">Check compiler output below (e.g. missing semicolon, type errors).</p>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                      {lastSubmissionStatus === "RE" && (
                        <>
                          <div className="flex items-center gap-2 border-2 border-foreground bg-destructive/20 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="font-display text-sm font-bold text-destructive">Runtime Exception</span>
                          </div>
                          <p className="font-body text-xs text-muted-foreground">Code compiled but crashed (e.g. array out of bounds, division by zero).</p>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                      {lastSubmissionStatus === "TLE" && (
                        <>
                          <div className="flex items-center gap-2 border-2 border-foreground bg-primary/20 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <AlertTriangle className="h-5 w-5 text-primary" />
                            <span className="font-display text-sm font-bold text-primary">Time Limit Exceeded</span>
                          </div>
                          <p className="font-body text-xs text-muted-foreground">Your algorithm was too slow and was terminated by the sandbox. Consider a more efficient approach (e.g. O(N) instead of O(N²)).</p>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                      {lastSubmissionStatus === "MLE" && (
                        <>
                          <div className="flex items-center gap-2 border-2 border-foreground bg-primary/20 px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <MemoryStick className="h-5 w-5 text-primary" />
                            <span className="font-display text-sm font-bold text-primary">Memory Limit Exceeded</span>
                          </div>
                          <p className="font-body text-xs text-muted-foreground">The sandbox heap limit was exceeded. Reduce memory usage (e.g. smaller structures, streaming).</p>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                      {lastSubmissionStatus === "IE" && (
                        <>
                          <div className="flex items-center gap-2 border-2 border-foreground bg-muted px-4 py-2" style={{ boxShadow: "var(--shadow-brutal)" }}>
                            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                            <span className="font-display text-sm font-bold text-muted-foreground">Judge System Failure</span>
                          </div>
                          <p className="font-body text-xs text-muted-foreground">Something went wrong on our side. Please try submitting again.</p>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                      {state === "error" && !lastSubmissionStatus && (
                        <>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-display text-sm font-bold">⚠️ {runOutput || "Execution Error"}</span>
                          </div>
                          {terminalLogs && (
                            <pre className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap bg-[#0d0d0d] text-[#e0e0e0] border-2 border-foreground" style={{ boxShadow: "var(--shadow-brutal)" }}>{terminalLogs}</pre>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PitCrewAI
        problemTitle={problem.title}
        problemDescription={problem.description}
        code={code}
        lang={lang}
        isOpen={aiOpen}
        onOpenChange={setAiOpen}
      />
    </div>
  );
};

export default ProblemDetail;
