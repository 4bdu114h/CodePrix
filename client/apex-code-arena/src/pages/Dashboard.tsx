import { motion } from "framer-motion";
import { Activity, Zap, Clock, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import TelemetryGauge from "@/components/TelemetryGauge";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import GoalSetter from "@/components/GoalSetter";
import { CheckeredFlag, HelmetIcon } from "@/components/RacingElements";
import { submissionHistory } from "@/lib/mockData";

const statusStyles: Record<string, string> = {
  Accepted: "bg-neo-green text-foreground border-foreground",
  "Wrong Answer": "bg-primary text-primary-foreground border-foreground",
  "Runtime Error": "bg-secondary text-secondary-foreground border-foreground",
};

const Dashboard = () => {
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
            <div className="neo-card p-5">
              <TelemetryGauge value={32} max={50} label="Problems Solved" color="primary" />
            </div>
            <div className="neo-card p-5">
              <TelemetryGauge value={18} max={25} label="Easy" color="accent" />
            </div>
            <div className="neo-card p-5">
              <TelemetryGauge value={10} max={15} label="Medium" color="steel" />
            </div>
            <div className="neo-card p-5">
              <TelemetryGauge value={4} max={10} label="Hard" color="primary" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Zap, label: "Avg Speed", value: "1.2s", bg: "bg-secondary" },
              { icon: TrendingUp, label: "Rank", value: "#42", bg: "bg-primary" },
              { icon: Clock, label: "Streak", value: "7 days", bg: "bg-neo-green" },
              { icon: Activity, label: "Submissions", value: "128", bg: "bg-accent" },
            ].map((s) => (
              <div key={s.label} className={`neo-card p-5 ${s.bg}`}>
                <s.icon className="h-5 w-5 mb-2" />
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="font-body text-xs font-bold uppercase tracking-wider opacity-70">{s.label}</p>
              </div>
            ))}
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

            {/* Recent Submissions (Lap Times) */}
            <div className="neo-card p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                🏎️ Recent Problems Solved
              </h2>
              <div className="space-y-3">
                {submissionHistory.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between border-2 border-foreground bg-background px-4 py-3"
                  >
                    <div>
                      <p className="font-body text-sm font-bold">{sub.problem}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {sub.lang} · {sub.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.time !== "—" && (
                        <span className="font-display text-sm font-bold text-foreground">{sub.time}</span>
                      )}
                      <span className={`neo-badge text-[10px] ${statusStyles[sub.status]}`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
