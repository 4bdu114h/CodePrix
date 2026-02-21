import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { CheckeredFlag, TrophyIcon } from "@/components/RacingElements";
import { leaderboardData } from "@/lib/mockData";

const podiumBg = ["bg-secondary", "bg-muted", "bg-secondary/50"];

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-2">🏆 Championship Standings</h1>
          <CheckeredFlag className="mb-8" />

          {/* Table */}
          <div className="border-2 border-foreground overflow-hidden" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-6 py-3 bg-accent text-accent-foreground border-b-2 border-foreground">
              <span className="font-display text-xs uppercase tracking-wider font-bold">Pos</span>
              <span className="font-display text-xs uppercase tracking-wider font-bold">Driver</span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-center">Solved</span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-center">Fastest</span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-right">Points</span>
            </div>

            {leaderboardData.map((driver, i) => (
              <motion.div
                key={driver.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 items-center px-6 py-4 border-b-2 border-foreground transition-colors hover:bg-secondary/30 ${
                  i < 3 ? podiumBg[i] : "bg-background"
                }`}
              >
                <span>
                  {driver.rank <= 3 ? (
                    <TrophyIcon place={driver.rank as 1 | 2 | 3} />
                  ) : (
                    <span className="font-display text-lg font-black text-muted-foreground">P{driver.rank}</span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-foreground bg-card flex items-center justify-center font-display text-xs font-bold" style={{ boxShadow: "2px 2px 0px hsl(230 40% 8%)" }}>
                    {driver.avatar}
                  </div>
                  <span className="font-body text-sm font-bold">{driver.name}</span>
                  {driver.rank === 1 && (
                    <span className="neo-badge bg-secondary text-secondary-foreground text-[9px]">
                      👑 Leader
                    </span>
                  )}
                </div>
                <span className="font-display text-sm font-bold text-center">{driver.solved}</span>
                <div className="flex items-center justify-center gap-1">
                  {i === 0 && <Zap className="h-3 w-3 text-foreground" />}
                  <span className="font-display text-sm font-bold">{driver.fastest}</span>
                  {i === 0 && (
                    <span className="neo-badge bg-secondary text-secondary-foreground text-[9px]">FL</span>
                  )}
                </div>
                <span className="font-display text-sm font-bold text-right">{driver.score}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Leaderboard;
