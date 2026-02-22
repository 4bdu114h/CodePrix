import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ChevronDown, Terminal, CheckCircle2, XCircle, AlertTriangle, Zap, Eye, Code2, NotebookPen, ChevronLeft, Clock, Loader2, Timer, MemoryStick } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CheckeredFlag } from "@/components/RacingElements";
import { problems } from "@/lib/mockData";
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

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
    }
};`,
  Python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Your code here
        pass`,
  Java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}`,
};

const solutionCode: Record<string, string> = {
  "C++": `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (mp.find(complement) != mp.end()) {
                return {mp[complement], i};
            }
            mp[nums[i]] = i;
        }
        return {};
    }
};`,
  Python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        mp = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in mp:
                return [mp[complement], i]
            mp[num] = i
        return []`,
  Java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> mp = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (mp.containsKey(complement)) {
                return new int[]{mp.get(complement), i};
            }
            mp.put(nums[i], i);
        }
        return new int[]{};
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

const ProblemDetail = () => {
  const { id } = useParams();
  const problem = problems.find((p) => p.id === Number(id)) || problems[0];
  const [lang, setLang] = useState("C++");
  const [code, setCode] = useState(() => {
    // Try to load saved code from localStorage on initial render
    const savedCode = localStorage.getItem(`codeprix-code-${id}-C++`);
    return savedCode || defaultCode["C++"];
  });
  const [state, setState] = useState<SubmissionState>("idle");
  const [runState, setRunState] = useState<RunState>("idle");
  const [runOutput, setRunOutput] = useState<string>("");
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

  const handleRun = () => {
    setRunState("running");
    setState("idle");
    setTimeout(() => {
      const hasError = Math.random() > 0.7;
      if (hasError) {
        setRunState("error");
        setRunOutput("Runtime Error: Segmentation fault\nLine 8: Invalid memory access");
      } else {
        setRunState("success");
        // Mock output for the two sum problem
        const mockOutputs = [
          "[0, 1]\nExecution time: 0.45s",
          "[1, 3]\nExecution time: 0.52s",
          "[2, 4]\nExecution time: 0.38s",
          "Output: [0, 1]\nTest case passed\nTime: 0.41s\nMemory: 12.5 MB",
        ];
        setRunOutput(mockOutputs[Math.floor(Math.random() * mockOutputs.length)]);
      }
    }, 1500);
  };

  const handleLangChange = (l: string) => {
    setLang(l);
    // Load saved code for the new language, or use default
    const savedCode = localStorage.getItem(`codeprix-code-${id}-${l}`);
    setCode(savedCode || defaultCode[l]);
    setLangOpen(false);
  };

  // Load saved code when component mounts or problem/language changes
  useEffect(() => {
    const codeKey = `codeprix-code-${id}-${lang}`;
    const savedCode = localStorage.getItem(codeKey);

    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(defaultCode[lang]);
    }

    // Reset states when switching problems
    setState("idle");
    setRunState("idle");
    setRunOutput("");
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
          <div className="border-r-2 border-foreground overflow-y-auto p-6 bg-card flex flex-col">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                <p className="mb-4">
                  Given an array of integers <code className="neo-badge bg-secondary text-secondary-foreground text-[10px] px-1 py-0">nums</code> and an integer{" "}
                  <code className="neo-badge bg-secondary text-secondary-foreground text-[10px] px-1 py-0">target</code>, return indices of the two numbers such that
                  they add up to target.
                </p>
                <p className="mb-4">You may assume that each input would have exactly one solution.</p>

                <h3 className="font-display text-sm font-bold mt-6 mb-2">Example 1:</h3>
                <div className="border-2 border-foreground bg-background p-4 font-mono text-xs" style={{ boxShadow: "var(--shadow-brutal)" }}>
                  <p><span className="font-bold">Input:</span> nums = [2,7,11,15], target = 9</p>
                  <p><span className="font-bold">Output:</span> [0,1]</p>
                  <p><span className="font-bold">Explanation:</span> nums[0] + nums[1] = 2 + 7 = 9</p>
                </div>

                <h3 className="font-display text-sm font-bold mt-6 mb-2">Constraints:</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>2 ≤ nums.length ≤ 10⁴</li>
                  <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
                  <li>Only one valid answer exists.</li>
                </ul>
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden flex-1"
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden flex-1"
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
                  disabled={runState === "running" || showSolution}
                  className="px-5 py-2 text-xs flex items-center gap-2 border-2 border-foreground font-bold bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                  style={{ boxShadow: "var(--shadow-brutal)" }}
                >
                  <Code2 className="h-3 w-3" />
                  {runState === "running" ? "⚙️ RUNNING..." : "▶ RUN"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || state === "running" || state === "pending" || showSolution}
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
              </div>
            </div>

            {/* Code Area + Notes Panel */}
            <div className="flex-1 flex overflow-hidden gap-0">
              {/* Code Editor Section */}
              <div className="flex flex-col overflow-hidden flex-1">
                {/* Code Area */}
                <div className="flex-1 overflow-hidden">
                  <textarea
                    value={showSolution ? solutionCode[lang] : code}
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
                  {runState === "success" && runOutput && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                        <span className="font-body text-xs font-bold">✅ Code executed successfully</span>
                      </div>
                      <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap">
                        {runOutput}
                      </pre>
                    </motion.div>
                  )}
                  {runState === "error" && runOutput && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-body text-xs font-bold text-destructive">❌ Runtime Error</span>
                      </div>
                      <pre className="font-mono text-xs bg-background border-2 border-foreground p-3 rounded whitespace-pre-wrap text-destructive">
                        {runOutput}
                      </pre>
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

                  {/* ── SYSTEM / SYNTAX ERROR: Terminal-style log block ── */}
                  {runState === "idle" && state === "error" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-display text-sm font-bold">⚠️ {runOutput || "Execution Error"}</span>
                      </div>
                      {terminalLogs && (
                        <pre
                          className="font-mono text-xs p-4 overflow-y-auto max-h-[180px] whitespace-pre-wrap"
                          style={{
                            background: "#0d0d0d",
                            color: "#e0e0e0",
                            border: "2px solid var(--foreground)",
                            boxShadow: "var(--shadow-brutal)",
                          }}
                        >
                          {terminalLogs}
                        </pre>
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
        problemDescription="Solve the coding problem shown on the left."
        code={code}
        lang={lang}
        isOpen={aiOpen}
        onOpenChange={setAiOpen}
      />
    </div>
  );
};

export default ProblemDetail;
