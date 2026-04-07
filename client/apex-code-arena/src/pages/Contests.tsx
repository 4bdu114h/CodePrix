import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Users, Flag, Lock, Play, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ChevronDown, NotebookPen, Loader2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { CheckeredFlag, AnimatedFlag } from "@/components/RacingElements";
import apiClient from "@/lib/apiClient";
import { encodeSourceCode, LANG_MAP } from "@/lib/submissionCodec";
import { useToast } from "@/hooks/use-toast";
import { useSubmissionStatus } from "@/hooks/useSubmissionStatus";
import type { SubmissionStatus } from "@/hooks/useSubmissionStatus";

/* ───── Types from API ───── */
interface ApiProblem {
  _id: string;
  problemId?: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  starterCode?: Record<string, string>;
  testCases?: { input: string; output: string }[];
}

interface ApiContest {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  problems: ApiProblem[];
  registeredUsers?: string[];
  createdAt?: string;
}

interface ContestDisplay {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: "upcoming" | "active" | "ended";
  participants: number;
  problems: ContestProblemDisplay[];
}

interface ContestProblemDisplay {
  id: string;
  problemId?: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  example: { input: string; output: string; explanation: string };
  solved: boolean;
}

/* ───── Helpers ───── */
function deriveStatus(startTime: Date, endTime: Date): "upcoming" | "active" | "ended" {
  const now = Date.now();
  if (now < startTime.getTime()) return "upcoming";
  if (now > endTime.getTime()) return "ended";
  return "active";
}

function mapApiContest(c: ApiContest): ContestDisplay {
  const start = new Date(c.startTime);
  const end = new Date(c.endTime);
  return {
    id: c._id,
    title: c.title,
    startTime: start,
    endTime: end,
    status: deriveStatus(start, end),
    participants: c.registeredUsers?.length ?? 0,
    problems: (c.problems || []).map((p) => ({
      id: p._id,
      problemId: p.problemId,
      title: p.title,
      difficulty: p.difficulty,
      description: p.description,
      example: p.examples?.[0]
        ? { input: p.examples[0].input, output: p.examples[0].output, explanation: p.examples[0].explanation || "" }
        : { input: "", output: "", explanation: "" },
      solved: false,
    })),
  };
}

/* ───── Countdown ───── */
const Countdown = ({ target }: { target: Date }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="font-display text-3xl font-black tracking-wider">{timeLeft}</span>
  );
};

/* ───── Race Lights Start Sequence ───── */
const RaceLights = ({ onGo }: { onGo: () => void }) => {
  const [lit, setLit] = useState(0);
  const [allOut, setAllOut] = useState(false);

  useEffect(() => {
    if (lit < 5) {
      const timer = setTimeout(() => setLit(lit + 1), 600);
      return () => clearTimeout(timer);
    } else if (!allOut) {
      const timer = setTimeout(() => {
        setAllOut(true);
        onGo();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [lit, allOut, onGo]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={`w-10 h-10 border-3 border-foreground transition-all duration-200 rounded-full ${allOut
                ? "bg-neo-green"
                : i < lit
                  ? "bg-primary"
                  : "bg-card"
              }`}
            animate={i < lit && !allOut ? { scale: [1, 1.15, 1] } : allOut ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            style={{ boxShadow: (i < lit && !allOut) ? "3px 3px 0 hsl(350 100% 40%)" : allOut ? "3px 3px 0 hsl(140 70% 35%)" : "3px 3px 0 hsl(230 40% 8%)" }}
          />
        ))}
      </div>
      <span className="font-display text-sm font-bold uppercase tracking-wider">
        {allOut ? "LIGHTS OUT AND AWAY WE GO!" : `${lit}/5 LIGHTS`}
      </span>
    </div>
  );
};

/* ───── Difficulty badge ───── */
const diffBadge: Record<string, string> = {
  Easy: "bg-secondary text-secondary-foreground border-foreground",
  Medium: "bg-steel-blue text-primary-foreground border-foreground",
  Hard: "bg-primary text-primary-foreground border-foreground",
};

const defaultCode: Record<string, string> = {
  "C++": `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution\n    return 0;\n}`,
  Python: `import sys\n\ndef solve():\n    # Write your solution\n    pass\n\nsolve()`,
  Java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution\n    }\n}`,
};

/* ───── Contest Problem Solver ───── */
const ContestProblemView = ({
  problem,
  raceActive,
  onBack,
  onSolve,
  contestId,
}: {
  problem: ContestProblemDisplay;
  raceActive: boolean;
  onBack: () => void;
  onSolve: (id: string) => void;
  contestId?: string;
}) => {
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem(`codeprix-contest-code-${problem.id}`);
    return saved || defaultCode["C++"];
  });
  const [state, setState] = useState<"idle" | "running" | "pending" | "accepted" | "wrong" | "error">("idle");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("C++");
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem(`codeprix-contest-notes-${problem.id}`);
    return savedNotes || "";
  });
  const [notesOpen, setNotesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState("");
  const [failedTestCase, setFailedTestCase] = useState<number | null>(null);
  const { toast } = useToast();

  // Polling for submission status
  const { submission: polledSubmission, error: pollingError } = useSubmissionStatus(submissionId);

  // React to polled status
  useEffect(() => {
    if (!polledSubmission) return;
    const s = polledSubmission.status;
    if (s === "PEND" || s === "RUN") {
      setState("pending");
      return;
    }
    if (s === "AC") {
      setState("accepted");
      onSolve(problem.id);
    } else if (s === "WA") {
      setState("wrong");
      setFailedTestCase(polledSubmission.failedTestCase ?? null);
    } else {
      setState("error");
      setTerminalLogs(polledSubmission.logs?.stderr || polledSubmission.logs?.stdout || s);
    }
    setSubmissionId(null);
  }, [polledSubmission]);

  useEffect(() => {
    if (pollingError) {
      setState("error");
      setTerminalLogs(`Polling error: ${pollingError}`);
      setSubmissionId(null);
    }
  }, [pollingError]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setState("running");
    setTerminalLogs("");
    setFailedTestCase(null);

    try {
      const encodedCode = encodeSourceCode(code);
      const res = await apiClient.post("/submissions", {
        code: encodedCode,
        problemId: problem.id,
        language: LANG_MAP[lang] || lang.toLowerCase(),
        ...(contestId ? { contestId } : {}),
      });

      setSubmissionId(res.data.submissionId);
      setState("pending");
      toast({
        title: "Submission Enqueued",
        description: `ID: ${res.data.submissionId} — judging in progress.`,
      });
    } catch (err: any) {
      setState("error");
      const message = err.response?.data?.error || err.message || "Submission failed.";
      setTerminalLogs(message);
      toast({ title: "Submission Failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-save code and notes
  useEffect(() => {
    localStorage.setItem(`codeprix-contest-code-${problem.id}`, code);
  }, [code, problem.id]);

  useEffect(() => {
    localStorage.setItem(`codeprix-contest-notes-${problem.id}`, notes);
  }, [notes, problem.id]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="neo-btn bg-card px-4 py-2 text-xs mb-4 flex items-center gap-2">
        <ArrowLeft className="h-3 w-3" /> Back to Problems
      </button>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Problem */}
        <div className="neo-card p-6 bg-background">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-lg font-bold">{problem.title}</h2>
            <span className={`neo-badge text-[10px] ${diffBadge[problem.difficulty]}`}>{problem.difficulty}</span>
            {problem.solved && <span className="neo-badge bg-neo-green text-foreground border-foreground text-[10px]">Solved</span>}
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              className={`px-3 py-1 text-[10px] flex items-center gap-1.5 border-2 border-foreground font-bold transition-colors flex-shrink-0 ${notesOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-primary/20"
                }`}
              style={{ boxShadow: "var(--shadow-brutal)" }}
            >
              <NotebookPen className="h-3 w-3" />
              NOTES
            </button>
          </div>
          <p className="font-body text-sm mb-4 whitespace-pre-wrap">{problem.description}</p>
          {problem.example.input && (
            <div className="border-2 border-foreground bg-card p-4 font-mono text-xs" style={{ boxShadow: "var(--shadow-brutal)" }}>
              <p><span className="font-bold">Input:</span> {problem.example.input}</p>
              <p><span className="font-bold">Output:</span> {problem.example.output}</p>
              {problem.example.explanation && <p><span className="font-bold">Explanation:</span> {problem.example.explanation}</p>}
            </div>
          )}

          {/* Notes Panel */}
          <motion.div
            initial={false}
            animate={{ opacity: notesOpen ? 1 : 0, height: notesOpen ? "auto" : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden mt-4"
          >
            <div className="border-2 border-foreground bg-background flex flex-col" style={{ boxShadow: "var(--shadow-brutal)", minHeight: "250px" }}>
              <div className="border-b-2 border-foreground px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4" />
                  <span className="font-display text-xs font-bold uppercase">Notes</span>
                </div>
                <span className="font-body text-[10px] text-primary-foreground/70">{notes.length || 0} chars</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add personal notes, hints, or solutions here..."
                className="flex-1 resize-none bg-background p-4 font-body text-xs text-foreground focus:outline-none border-none placeholder-muted-foreground"
                spellCheck={false}
              />
              <div className="border-t-2 border-foreground px-4 py-2 bg-card text-[10px] text-muted-foreground flex-shrink-0">
                Auto-saved to browser
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Editor */}
        <div className="neo-card flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2 bg-card">
            <div className="relative">
              <button onClick={() => raceActive && setLangOpen(!langOpen)} disabled={!raceActive} className={`neo-badge cursor-pointer bg-background flex items-center gap-2 ${!raceActive ? "opacity-60 cursor-not-allowed" : ""}`}>
                {lang} <ChevronDown className="h-3 w-3" />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 mt-1 border-2 border-foreground bg-background z-10" style={{ boxShadow: "var(--shadow-brutal)" }}>
                  {["C++", "Python", "Java"].map((l) => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      className="block w-full px-4 py-2 text-left font-body text-xs font-bold hover:bg-secondary transition-colors border-b border-foreground last:border-b-0">
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || state === "running" || state === "pending" || problem.solved}
              className="neo-btn-primary px-5 py-2 text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {submitting || state === "running" || state === "pending" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {submitting || state === "running"
                ? "Pit Stop..."
                : state === "pending"
                  ? "Judging..."
                  : problem.solved
                    ? "Solved"
                    : !raceActive
                      ? "View Results"
                      : "Submit"}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => raceActive && !submitting && setCode(e.target.value)}
            readOnly={!raceActive || submitting}
            className={`flex-1 min-h-[200px] resize-none bg-background p-4 font-mono text-sm text-foreground focus:outline-none ${!raceActive || submitting ? "opacity-60 cursor-not-allowed" : ""}`}
            placeholder="// Write your solution here..."
            spellCheck={false}
          />
          <div className={`border-t-2 border-foreground p-4 ${state === "accepted" ? "bg-neo-green/20" : state === "wrong" ? "bg-primary/10" : state === "error" ? "bg-secondary/30" : state === "pending" ? "bg-steel-blue/10" : "bg-card"}`}>
            {state === "idle" && <p className="font-mono text-xs text-muted-foreground">Submit to see results...</p>}
            {(state === "running" || state === "pending") && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-mono text-xs font-bold">
                  {state === "pending" ? "Judging in progress..." : "Submitting..."}
                </span>
              </div>
            )}
            {state === "accepted" && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /><span className="font-body text-sm font-bold">Accepted!</span>
              </motion.div>
            )}
            {state === "wrong" && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-primary" /><span className="font-body text-sm font-bold text-primary">Wrong Answer</span>
                </div>
                {failedTestCase !== null && (
                  <p className="font-mono text-xs">Failed at Test Case #{failedTestCase}</p>
                )}
              </motion.div>
            )}
            {state === "error" && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /><span className="font-body text-sm font-bold">Error</span>
                </div>
                {terminalLogs && (
                  <pre className="font-mono text-xs p-2 max-h-[120px] overflow-y-auto bg-[#0d0d0d] text-[#e0e0e0] border border-foreground whitespace-pre-wrap">{terminalLogs}</pre>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ───── Status Badge ───── */
const statusBadge: Record<string, string> = {
  upcoming: "bg-secondary text-secondary-foreground border-foreground",
  active: "bg-neo-green text-foreground border-foreground",
  ended: "bg-muted text-muted-foreground border-foreground",
};

/* ───── Main Contests Page ───── */
const Contests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contestList, setContestList] = useState<ContestDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [enteredContest, setEnteredContest] = useState<ContestDisplay | null>(null);
  const [showLights, setShowLights] = useState(false);
  const [raceStarted, setRaceStarted] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<ContestProblemDisplay | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);

  // Fetch contests from API
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/contests");
        const mapped = (Array.isArray(data) ? data : []).map(mapApiContest);
        // Sort: active first, then upcoming, then ended
        mapped.sort((a, b) => {
          const order = { active: 0, upcoming: 1, ended: 2 };
          return order[a.status] - order[b.status];
        });
        setContestList(mapped);
        setFetchError(null);
      } catch (err: any) {
        setFetchError(err.response?.data?.message || err.message || "Failed to load contests");
      } finally {
        setLoading(false);
      }
    };
    fetchContests();
  }, []);

  // Periodically refresh contest statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setContestList((prev) =>
        prev.map((c) => ({ ...c, status: deriveStatus(c.startTime, c.endTime) }))
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegisterAndEnter = async (contest: ContestDisplay) => {
    setRegistering(true);
    try {
      await apiClient.post(`/contests/${contest.id}/register`);
    } catch {
      // Already registered or error — continue anyway
    }
    setRegistering(false);
    setEnteredContest(contest);
    setShowLights(true);
    setRaceStarted(false);
    setSolvedProblems(new Set());
    setSelectedProblem(null);
  };

  const handleLightsOut = useCallback(() => {
    setShowLights(false);
    setRaceStarted(true);
  }, []);

  const handleSolve = useCallback((problemId: string) => {
    setSolvedProblems((prev) => new Set([...prev, problemId]));
  }, []);

  const handleBack = () => {
    setEnteredContest(null);
    setRaceStarted(false);
    setShowLights(false);
    setSelectedProblem(null);
  };

  const isRaceActive = (contest: ContestDisplay) => {
    const now = Date.now();
    return now >= contest.startTime.getTime() && now <= contest.endTime.getTime();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {/* RACE LIGHTS OVERLAY */}
          {showLights && (
            <motion.div
              key="lights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background flex items-center justify-center"
            >
              <RaceLights onGo={handleLightsOut} />
            </motion.div>
          )}

          {/* CONTEST LIST */}
          {!enteredContest && (
            <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-2">
                <AnimatedFlag size={36} />
                <h1 className="font-display text-2xl font-bold">Race Calendar</h1>
              </div>
              <CheckeredFlag className="mb-8" />

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="font-body">Loading contests...</span>
                </div>
              ) : fetchError ? (
                <div className="border-2 border-foreground p-12 text-center" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
                  <p className="font-display text-lg font-bold text-muted-foreground">Failed to load contests</p>
                  <p className="font-body text-sm text-muted-foreground mt-2">{fetchError}</p>
                </div>
              ) : contestList.length === 0 ? (
                <div className="border-2 border-foreground p-12 text-center" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
                  <p className="font-display text-lg font-bold text-muted-foreground">No contests available</p>
                  <p className="font-body text-sm text-muted-foreground mt-2">Check back later for upcoming races.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {contestList.map((contest, i) => (
                    <motion.div
                      key={contest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`neo-card p-6 ${contest.status === "active" ? "bg-neo-green/10 border-foreground" : "bg-background"}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="font-display text-lg font-bold">{contest.title}</h2>
                            <span className={`neo-badge text-[10px] ${statusBadge[contest.status]}`}>
                              {contest.status === "active" ? "LIVE" : contest.status === "upcoming" ? "Upcoming" : "Ended"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground font-body text-sm font-bold">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {contest.participants} racers</span>
                            <span className="flex items-center gap-1"><Flag className="h-3 w-3" /> {contest.problems.length} problems</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {contest.status === "upcoming" && (
                            <>
                              <span className="font-body text-xs text-muted-foreground uppercase tracking-wider font-bold">Starts in</span>
                              <Countdown target={contest.startTime} />
                            </>
                          )}
                          {contest.status === "active" && (
                            <>
                              <span className="font-body text-xs uppercase tracking-wider font-bold">Time remaining</span>
                              <Countdown target={contest.endTime} />
                            </>
                          )}
                          {contest.status === "ended" && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4" />
                              <span className="font-body text-sm font-bold">Race Closed</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {contest.status === "active" && (
                        <div className="mt-4 pt-4 border-t-2 border-foreground flex items-center gap-3">
                          <button
                            onClick={() => handleRegisterAndEnter(contest)}
                            disabled={registering}
                            className="neo-btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
                          >
                            {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                            {registering ? "Joining..." : "Enter Race"}
                          </button>
                          <button
                            onClick={() => navigate(`/leaderboard/${contest.id}`)}
                            className="neo-btn bg-card px-6 py-3 text-sm flex items-center gap-2"
                          >
                            <Trophy className="h-4 w-4" /> Leaderboard
                          </button>
                        </div>
                      )}

                      {contest.status === "ended" && (
                        <div className="mt-4 pt-4 border-t-2 border-foreground flex items-center gap-3">
                          <button
                            onClick={() => { setEnteredContest(contest); setRaceStarted(true); }}
                            className="neo-btn bg-card px-6 py-3 text-sm flex items-center gap-2"
                          >
                            View Results
                          </button>
                          <button
                            onClick={() => navigate(`/leaderboard/${contest.id}`)}
                            className="neo-btn bg-card px-6 py-3 text-sm flex items-center gap-2"
                          >
                            <Trophy className="h-4 w-4" /> Leaderboard
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* INSIDE A CONTEST */}
          {enteredContest && !showLights && (
            <motion.div key="contest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Contest Header */}
              <div className="flex items-center gap-3 mb-2">
                <button onClick={handleBack} className="neo-btn bg-card px-3 py-2 text-xs">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="font-display text-xl font-bold">{enteredContest.title}</h1>
                <span className={`neo-badge text-[10px] ${isRaceActive(enteredContest) ? "bg-neo-green text-foreground border-foreground" : "bg-muted text-muted-foreground border-foreground"}`}>
                  {isRaceActive(enteredContest) ? "RACE LIVE" : "RACE CLOSED"}
                </span>
                <button
                  onClick={() => navigate(`/leaderboard/${enteredContest.id}`)}
                  className="neo-btn bg-card px-3 py-2 text-xs flex items-center gap-1.5"
                >
                  <Trophy className="h-3 w-3" /> Leaderboard
                </button>
              </div>

              {/* Timer bar */}
              <div className="neo-card p-4 mb-6 flex items-center justify-between bg-background">
                <div className="flex items-center gap-4">
                  <Timer className="h-5 w-5" />
                  <span className="font-body text-sm font-bold">
                    {solvedProblems.size}/{enteredContest.problems.length} solved
                  </span>
                  <div className="w-32 h-4 border-2 border-foreground bg-card">
                    <div className="h-full bg-neo-green transition-all" style={{ width: `${(solvedProblems.size / Math.max(enteredContest.problems.length, 1)) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs font-bold uppercase tracking-wider">Time</span>
                  <Countdown target={enteredContest.endTime} />
                </div>
              </div>

              <CheckeredFlag className="mb-6" />

              {/* Problem selected? Show solver. Otherwise show list. */}
              <AnimatePresence mode="wait">
                {selectedProblem ? (
                  <ContestProblemView
                    key={selectedProblem.id}
                    problem={{ ...selectedProblem, solved: solvedProblems.has(selectedProblem.id) }}
                    raceActive={isRaceActive(enteredContest)}
                    onBack={() => setSelectedProblem(null)}
                    onSolve={handleSolve}
                    contestId={enteredContest.id}
                  />
                ) : (
                  <motion.div key="problem-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="space-y-3">
                      {enteredContest.problems.map((p, i) => {
                        const solved = solvedProblems.has(p.id);
                        return (
                          <motion.button
                            key={p.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedProblem(p)}
                            className={`w-full neo-card flex items-center justify-between px-6 py-4 text-left ${solved ? "bg-neo-green/10" : "bg-background"}`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-display text-xs text-muted-foreground font-bold">Q{i + 1}</span>
                              {solved ? (
                                <span className="w-6 h-6 bg-neo-green border-2 border-foreground flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                                </span>
                              ) : (
                                <span className="w-6 h-6 border-2 border-foreground bg-card" />
                              )}
                              <span className="font-body text-sm font-bold">{p.title}</span>
                            </div>
                            <span className={`neo-badge text-[10px] ${diffBadge[p.difficulty]}`}>{p.difficulty}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Contests;
