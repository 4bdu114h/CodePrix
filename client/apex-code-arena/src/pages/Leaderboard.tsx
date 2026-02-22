import { motion } from "framer-motion";
import { Zap, Wifi, WifiOff } from "lucide-react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { CheckeredFlag, TrophyIcon } from "@/components/RacingElements";
import { useLeaderboardSocket, RankEntry } from "@/hooks/useLeaderboardSocket";

const podiumBg = ["bg-secondary", "bg-muted", "bg-secondary/50"];

const Leaderboard = () => {
  const { contestCode } = useParams<{ contestCode: string }>();
  const { rankList, isConnected } = useLeaderboardSocket(contestCode || "");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display text-2xl font-bold">🏆 Championship Standings</h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-body text-green-500">
                  <Wifi className="h-3.5 w-3.5" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-body text-muted-foreground">
                  <WifiOff className="h-3.5 w-3.5" />
                  Connecting...
                </span>
              )}
            </div>
          </div>
          <CheckeredFlag className="mb-8" />

          {!contestCode ? (
            <div className="border-2 border-foreground p-12 text-center" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
              <p className="font-display text-lg font-bold text-muted-foreground">
                No contest selected
              </p>
              <p className="font-body text-sm text-muted-foreground mt-2">
                Navigate to a contest to view its live leaderboard.
              </p>
            </div>
          ) : rankList.length === 0 ? (
            <div className="border-2 border-foreground p-12 text-center" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
              <p className="font-display text-lg font-bold text-muted-foreground">
                {isConnected ? "Waiting for submissions..." : "Connecting to leaderboard..."}
              </p>
              <p className="font-body text-sm text-muted-foreground mt-2">
                The leaderboard will update in real-time as participants submit solutions.
              </p>
            </div>
          ) : (
            <div className="border-2 border-foreground overflow-hidden" style={{ boxShadow: "var(--shadow-brutal-lg)" }}>
              {/* Header */}
              <div className="grid grid-cols-[60px_1fr_100px_100px] gap-4 px-6 py-3 bg-accent text-accent-foreground border-b-2 border-foreground">
                <span className="font-display text-xs uppercase tracking-wider font-bold">Pos</span>
                <span className="font-display text-xs uppercase tracking-wider font-bold">Driver</span>
                <span className="font-display text-xs uppercase tracking-wider font-bold text-center">Solved</span>
                <span className="font-display text-xs uppercase tracking-wider font-bold text-right">Score</span>
              </div>

              {rankList.map((entry: RankEntry, i: number) => {
                const rank = i + 1;
                return (
                  <motion.div
                    key={entry.user.email}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`grid grid-cols-[60px_1fr_100px_100px] gap-4 items-center px-6 py-4 border-b-2 border-foreground transition-colors hover:bg-secondary/30 ${i < 3 ? podiumBg[i] : "bg-background"
                      }`}
                  >
                    <span>
                      {rank <= 3 ? (
                        <TrophyIcon place={rank as 1 | 2 | 3} />
                      ) : (
                        <span className="font-display text-lg font-black text-muted-foreground">P{rank}</span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 border-2 border-foreground bg-card flex items-center justify-center font-display text-xs font-bold"
                        style={{ boxShadow: "2px 2px 0px hsl(230 40% 8%)" }}
                      >
                        {(entry.user.name || entry.user.email)[0].toUpperCase()}
                      </div>
                      <span className="font-body text-sm font-bold">
                        {entry.user.name || entry.user.email}
                      </span>
                      {rank === 1 && (
                        <span className="neo-badge bg-secondary text-secondary-foreground text-[9px]">
                          👑 Leader
                        </span>
                      )}
                    </div>
                    <span className="font-display text-sm font-bold text-center">
                      {entry.problemsSolvedIds?.length || 0}
                    </span>
                    <span className="font-display text-sm font-bold text-right">{entry.score}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Leaderboard;
