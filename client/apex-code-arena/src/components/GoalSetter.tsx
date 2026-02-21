import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2 } from "lucide-react";
import { submissionHistory } from "@/lib/mockData";

interface GoalSetterProps {
  onGoalChange?: (goals: { problems: number; days: number }) => void;
}

const GoalSetter = ({ onGoalChange }: GoalSetterProps) => {
  const [problemsGoal, setProblemsGoal] = useState(50);
  const [daysGoal, setDaysGoal] = useState(30);
  const [problemsSolved, setProblemsSolved] = useState(0);

  // Count problems solved from submission history
  useEffect(() => {
    const solvedCount = submissionHistory.filter((sub) => sub.status === "Accepted").length;
    setProblemsSolved(solvedCount);
  }, []);

  // Notify parent of goal changes
  useEffect(() => {
    onGoalChange?.({ problems: problemsGoal, days: daysGoal });
  }, [problemsGoal, daysGoal, onGoalChange]);

  const problemsProgress = (problemsSolved / problemsGoal) * 100;
  const problemsComplete = problemsSolved >= problemsGoal;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
          Goal Setter
        </h3>
      </div>

      <div className="space-y-4">
        {/* Problems Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-body text-xs font-bold text-foreground">Problems Goal</label>
            <span className="font-display text-base font-bold text-primary">{problemsGoal}</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={problemsGoal}
            onChange={(e) => setProblemsGoal(Number(e.target.value))}
            className="w-full h-2 bg-secondary border-2 border-foreground rounded appearance-none cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, hsl(350 100% 50%) 0%, hsl(350 100% 50%) ${
                (problemsGoal / 200) * 100
              }%, hsl(54 100% 50%) ${(problemsGoal / 200) * 100}%, hsl(54 100% 50%) 100%)`,
            }}
          />
          <div className="text-xs text-muted-foreground">10 - 200</div>
        </div>

        {/* Problems Progress */}
        <div className="space-y-1 bg-background p-3 border-2 border-foreground">
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-xs font-bold text-foreground">
              {problemsSolved} / {problemsGoal}
            </span>
            {problemsComplete && <CheckCircle2 className="h-3 w-3 text-neo-green" />}
          </div>
          <div className="w-full bg-secondary border-2 border-foreground h-3 relative overflow-hidden">
            <motion.div
              animate={{ width: `${Math.min(problemsProgress, 100)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-primary"
            />
          </div>
          <div className="text-xs text-muted-foreground font-bold">
            {Math.round(problemsProgress)}% Complete
          </div>
        </div>

        {/* Days Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-body text-xs font-bold text-foreground">Days Goal</label>
            <span className="font-display text-base font-bold text-secondary">{daysGoal}</span>
          </div>
          <input
            type="range"
            min="7"
            max="90"
            step="1"
            value={daysGoal}
            onChange={(e) => setDaysGoal(Number(e.target.value))}
            className="w-full h-2 bg-primary border-2 border-foreground rounded appearance-none cursor-pointer accent-secondary"
            style={{
              background: `linear-gradient(to right, hsl(54 100% 50%) 0%, hsl(54 100% 50%) ${
                (daysGoal / 90) * 100
              }%, hsl(140 70% 50%) ${(daysGoal / 90) * 100}%, hsl(140 70% 50%) 100%)`,
            }}
          />
          <div className="text-xs text-muted-foreground">7 - 90 days</div>
        </div>
      </div>
    </motion.div>
  );
};

export default GoalSetter;
