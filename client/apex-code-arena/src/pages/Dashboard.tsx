import { motion } from "framer-motion";
import { Activity, Zap, Clock, TrendingUp, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import TelemetryGauge from "@/components/TelemetryGauge";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import GoalSetter from "@/components/GoalSetter";
import { CheckeredFlag, HelmetIcon } from "@/components/RacingElements";
import { useDashboardStats, RecentSubmission } from "@/hooks/useDashboardStats";

// ── Status Code → Display Label + Color Mapping ─────────────────────
const statusConfig: Record<string, { label: string; className: string }> = {
  AC: { label: "Accepted", className: "bg-neo-green text-foreground border-foreground" },
  WA: { label: "Wrong Answer", className: "bg-primary text-primary-foreground border-foreground" },
  TLE: { label: "Time Limit", className: "bg-primary text-primary-foreground border-foreground" },
  MLE: { label: "Memory Limit", className: "bg-primary text-primary-foreground border-foreground" },
  RE: { label: "Runtime Error", className: "bg-secondary text-secondary-foreground border-foreground" },
  CE: { label: "Compile Error", className: "bg-yellow-400 text-foreground border-foreground" },
  PEND: { label: "Pending", className: "bg-muted text-muted-foreground border-foreground" },
  RUN: { label: "Running", className: "bg-muted text-muted-foreground border-foreground" },
  IE: { label: "Internal Error", className: "bg-muted text-muted-foreground border-foreground" },
};

// ── Skeleton Loader Components ──────────────────────────────────────
const SkeletonCard = () => (
  <div className="neo-card p-5 animate-pulse">
    <div className="h-4 w-12 bg-muted-foreground/20 rounded mb-3" />
    <div className="h-7 w-16 bg-muted-foreground/20 rounded mb-2" />
    <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center justify-between border-2 border-foreground bg-background px-4 py-3 animate-pulse">
    <div>
      <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-2" />
      <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
    </div>
    <div className="flex items-center gap-3">
      <div className="h-4 w-10 bg-muted-foreground/20 rounded" />
      <div className="h-5 w-16 bg-muted-foreground/20 rounded" />
    </div>
  </div>
);

const SkeletonGauge = () => (
  <div className="neo-card p-5 animate-pulse">
    <div className="h-20 w-20 mx-auto bg-muted-foreground/20 rounded-full mb-3" />
    <div className="h-3 w-24 mx-auto bg-muted-foreground/20 rounded" />
  </div>
);

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Dashboard = () => {
  const { data: stats, isLoading, error } = useDashboardStats();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <HelmetIcon color="primary" size={36} />
            <h1 className="font-display text-2xl font-bold">Telemetry Dashboard</h1>
          </div>
          <CheckeredFlag className="mb-8" />

          {/* Gauges Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <>
                <SkeletonGauge />
                <SkeletonGauge />
                <SkeletonGauge />
                <SkeletonGauge />
              </>
            ) : (
              <>
                <div className="neo-card p-5">
                  <TelemetryGauge
                    value={stats?.uniqueSolved ?? 0}
                    max={Math.max(stats?.uniqueSolved ?? 1, 50)}
                    label="Problems Solved"
                    color="primary"
                  />
                </div>
                <div className="neo-card p-5">
                  <TelemetryGauge
                    value={stats?.totalAC ?? 0}
                    max={Math.max(stats?.totalSubmissions ?? 1, 1)}
                    label="Accepted"
                    color="accent"
                  />
                </div>
                <div className="neo-card p-5">
                  <TelemetryGauge
                    value={stats?.accuracyRate ?? 0}
                    max={100}
                    label="Accuracy %"
                    color="steel"
                  />
                </div>
                <div className="neo-card p-5">
                  <TelemetryGauge
                    value={stats?.totalSubmissions ?? 0}
                    max={Math.max(stats?.totalSubmissions ?? 1, 100)}
                    label="Total Runs"
                    color="primary"
                  />
                </div>
              </>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {[
                  { icon: Target, label: "Solved", value: String(stats?.uniqueSolved ?? 0), bg: "bg-secondary" },
                  { icon: Zap, label: "Accuracy", value: `${stats?.accuracyRate ?? 0}%`, bg: "bg-primary" },
                  { icon: TrendingUp, label: "Total AC", value: String(stats?.totalAC ?? 0), bg: "bg-neo-green" },
                  { icon: Activity, label: "Submissions", value: String(stats?.totalSubmissions ?? 0), bg: "bg-accent" },
                ].map((s) => (
                  <div key={s.label} className={`neo-card p-5 ${s.bg}`}>
                    <s.icon className="h-5 w-5 mb-2" />
                    <p className="font-display text-xl font-bold">{s.value}</p>
                    <p className="font-body text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="grid gap-6">
            {/* Activity Heatmap and Goal Setter */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 neo-card p-6">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  🏁 Activity Heatmap
                </h2>
                <ActivityHeatmap />
              </div>
              <div>
                <GoalSetter />
              </div>
            </div>

            {/* Recent Submissions (Live Data) */}
            <div className="neo-card p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                🏎️ Recent Submissions
              </h2>
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="font-body text-sm text-muted-foreground">
                      Failed to load submissions. Please try again later.
                    </p>
                  </div>
                ) : stats?.recentSubmissions?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-body text-sm text-muted-foreground">
                      No submissions yet. Solve a problem to see your history here!
                    </p>
                  </div>
                ) : (
                  stats?.recentSubmissions?.map((sub: RecentSubmission) => {
                    const cfg = statusConfig[sub.status] || statusConfig.IE;
                    return (
                      <div
                        key={sub._id}
                        className="flex items-center justify-between border-2 border-foreground bg-background px-4 py-3"
                      >
                        <div>
                          <p className="font-body text-sm font-bold">
                            {sub.problem?.title || "Unknown Problem"}
                          </p>
                          <p className="font-body text-xs text-muted-foreground">
                            {sub.language} · {formatTimeAgo(sub.createdAt)}
                            {sub.problem?.difficulty && (
                              <span className="ml-2 opacity-60">· {sub.problem.difficulty}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {sub.metrics?.time > 0 && (
                            <span className="font-display text-sm font-bold text-foreground">
                              {(sub.metrics.time / 1000).toFixed(1)}s
                            </span>
                          )}
                          <span className={`neo-badge text-[10px] ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
