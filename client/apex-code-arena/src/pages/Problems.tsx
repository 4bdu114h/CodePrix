import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CheckeredFlag } from "@/components/RacingElements";
import { problems } from "@/lib/mockData";

type Difficulty = "All" | "Easy" | "Medium" | "Hard";

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
  const filtered = filter === "All" ? problems : problems.filter((p) => p.difficulty === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display text-2xl font-bold">🏁 Problem Grid</h1>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(["All", "Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setFilter(d)}
                  className={`neo-badge cursor-pointer transition-all ${
                    filter === d ? filterActive[d] : "bg-card text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <CheckeredFlag className="mb-6" />

          <div className="space-y-3">
            {filtered.map((problem, i) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/problems/${problem.id}`}
                  className="group neo-card flex items-center justify-between px-6 py-4 bg-background"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xs text-muted-foreground w-8 font-bold">
                      #{problem.id}
                    </span>
                    {problem.solved ? (
                      <span className="w-6 h-6 bg-neo-green border-2 border-foreground flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                      </span>
                    ) : (
                      <span className="w-6 h-6 border-2 border-foreground bg-card" />
                    )}
                    <span className="font-body text-sm font-bold group-hover:text-primary transition-colors">
                      {problem.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-body text-xs text-muted-foreground font-bold">{problem.category}</span>
                    <span className="font-body text-xs text-muted-foreground">{problem.acceptance}%</span>
                    <span className={`neo-badge text-[10px] ${difficultyBadge[problem.difficulty]}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Problems;
