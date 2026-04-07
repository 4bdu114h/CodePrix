import { useState } from "react";
import { motion } from "framer-motion";
import { Flag, Loader2, CheckCircle2, AlertTriangle, Settings2, Clock, Hash, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { CheckeredFlag, AnimatedFlag } from "@/components/RacingElements";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

type Difficulty = "Easy" | "Medium" | "Hard" | "Random";

interface GeneratedContest {
  contestId: string;
  title: string;
  problemCount: number;
  startTime: string;
  endTime: string;
}

const CreateContest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState<Difficulty>("Random");
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GeneratedContest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Random"];

  const handleGenerate = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await apiClient.post("/contests/generate", {
        difficulty,
        questionCount,
        durationMinutes,
      });

      setResult(data);
      toast({
        title: "Contest Created",
        description: `${data.title} — ${data.problemCount} problems, starts now!`,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to create contest";
      setError(message);
      toast({ title: "Creation Failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <AnimatedFlag size={36} />
            <h1 className="font-display text-2xl font-bold">Race Engineer</h1>
          </div>
          <p className="font-body text-sm text-muted-foreground mb-2">
            Generate a new contest with random problems from the database.
          </p>
          <CheckeredFlag className="mb-8" />

          {/* Configuration Form */}
          <div className="neo-card p-6 bg-background space-y-6">
            {/* Difficulty */}
            <div>
              <label className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5" /> Difficulty
              </label>
              <div className="flex gap-2 flex-wrap">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 text-xs font-bold border-2 border-foreground transition-colors ${
                      difficulty === d
                        ? d === "Easy"
                          ? "bg-secondary text-secondary-foreground"
                          : d === "Medium"
                            ? "bg-steel-blue text-primary-foreground"
                            : d === "Hard"
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-accent-foreground"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                    style={{ boxShadow: difficulty === d ? "var(--shadow-brutal)" : "none" }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <Hash className="h-3.5 w-3.5" /> Number of Problems
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary"
                />
                <span className="font-display text-2xl font-black min-w-[3ch] text-right">{questionCount}</span>
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1">1 to 20 problems</p>
            </div>

            {/* Duration */}
            <div>
              <label className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5" /> Duration (minutes)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={480}
                  step={10}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary"
                />
                <span className="font-display text-2xl font-black min-w-[4ch] text-right">{durationMinutes}</span>
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1">
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m — 10 min to 8 hours
              </p>
            </div>

            {/* Summary */}
            <div className="border-2 border-foreground bg-card p-4" style={{ boxShadow: "var(--shadow-brutal)" }}>
              <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                <Settings2 className="h-3 w-3 inline mr-1" /> Configuration Summary
              </p>
              <div className="font-body text-sm space-y-1">
                <p><span className="font-bold">Difficulty:</span> {difficulty}</p>
                <p><span className="font-bold">Problems:</span> {questionCount}</p>
                <p><span className="font-bold">Duration:</span> {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</p>
                <p><span className="font-bold">Start:</span> Immediately upon creation</p>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={submitting}
              className="neo-btn-primary w-full px-6 py-4 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Generate Contest
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-2 border-foreground bg-destructive/10 p-4" style={{ boxShadow: "var(--shadow-brutal)" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-body text-sm font-bold text-destructive">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Success Result */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="border-2 border-foreground bg-neo-green/20 p-4" style={{ boxShadow: "var(--shadow-brutal)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-foreground" />
                    <span className="font-display text-sm font-bold">Contest Created!</span>
                  </div>
                  <div className="font-body text-sm space-y-1">
                    <p><span className="font-bold">Title:</span> {result.title}</p>
                    <p><span className="font-bold">Problems:</span> {result.problemCount}</p>
                    <p><span className="font-bold">Start:</span> {new Date(result.startTime).toLocaleString()}</p>
                    <p><span className="font-bold">End:</span> {new Date(result.endTime).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/contests")}
                    className="neo-btn-primary px-6 py-3 text-sm flex items-center gap-2"
                  >
                    <Flag className="h-4 w-4" /> Go to Contests
                  </button>
                  <button
                    onClick={() => navigate(`/leaderboard/${result.contestId}`)}
                    className="neo-btn bg-card px-6 py-3 text-sm flex items-center gap-2"
                  >
                    View Leaderboard
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CreateContest;
