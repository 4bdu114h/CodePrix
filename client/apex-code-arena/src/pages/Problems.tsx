import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CheckeredFlag } from "@/components/RacingElements";
import apiClient from "@/lib/apiClient";

type Difficulty = "All" | "Easy" | "Medium" | "Hard";

export interface ProblemFromApi {
  _id: string;
  problemId?: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category?: string;
  tags?: string[];
  testCases?: { input: string; output: string }[];
}

interface PaginatedResponse {
  problems: ProblemFromApi[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const MAX_PROBLEMS = 1000;

const difficultyBadge: Record<string, string> = {
  Easy: "bg-secondary text-secondary-foreground border-foreground",
  Medium: "bg-steel-blue text-primary-foreground border-foreground",
  Hard: "bg-primary text-primary-foreground border-foreground",
};

const filterActive: Record<string, string> = {
  All: "bg-foreground text-background",
  Easy: "bg-secondary text-secondary-foreground",
  Medium: "bg-steel-blue text-primary-foreground",
  Hard: "bg-primary text-primary-foreground",
};

const Problems = () => {
  const [filter, setFilter] = useState<Difficulty>("All");
  const [problems, setProblems] = useState<ProblemFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = {
          page: 1,
          limit: MAX_PROBLEMS,
        };
        if (filter !== "All") params.difficulty = filter;

        const { data } = await apiClient.get<PaginatedResponse>("/problems", { params });
        setProblems(data.problems);
        setTotalCount(data.totalCount);
        setError(null);
      } catch (err) {
        setError("Failed to load problems");
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">🏁 Problem Grid</h1>
              {!loading && (
                <span className="font-body text-xs text-muted-foreground font-bold">
                  {totalCount} problems
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(["All", "Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setFilter(d)}
                  className={`neo-badge cursor-pointer transition-all ${filter === d ? filterActive[d] : "bg-card text-muted-foreground"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <CheckeredFlag className="mb-6" />

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading problems...</span>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-destructive font-body">{error}</div>
          ) : problems.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body">No problems found.</div>
          ) : (
            <>
              {/* Problem List */}
              <div className="space-y-3">
                {problems.map((problem, i) => {
                  const displayId = problem.problemId ?? problem._id;
                  return (
                    <motion.div
                      key={problem._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <Link
                        to={`/problems/${displayId}`}
                        className="group neo-card flex items-center justify-between px-6 py-4 bg-background"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-display text-xs text-muted-foreground w-10 font-bold text-right tabular-nums">
                            {i + 1}.
                          </span>
                          <span className="font-body text-sm font-bold group-hover:text-primary transition-colors">
                            {problem.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-body text-xs text-muted-foreground font-bold">
                            {problem.category || problem.tags?.[0] || "General"}
                          </span>
                          <span className={`neo-badge text-[10px] ${difficultyBadge[problem.difficulty]}`}>
                            {problem.difficulty}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Summary */}
              {totalCount > 0 && (
                <div className="text-center mt-6 font-body text-xs text-muted-foreground">
                  Showing {problems.length} of {totalCount} problems
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Problems;
