import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TelemetryGaugeProps {
  value: number;
  max: number;
  label: string;
  color?: "primary" | "accent" | "steel";
}

const colorMap = {
  primary: "hsl(350, 100%, 50%)",
  accent: "hsl(54, 100%, 50%)",
  steel: "hsl(226, 23%, 52%)",
};

const bgMap = {
  primary: "bg-primary",
  accent: "bg-secondary",
  steel: "bg-steel-blue",
};

const TelemetryGauge = ({ value, max, label, color = "primary" }: TelemetryGaugeProps) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = (animatedValue / max) * 100;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <span className="font-display text-3xl font-black text-foreground">{animatedValue}<span className="text-sm text-muted-foreground">/{max}</span></span>
      {/* Neo-brutal progress bar */}
      <div className="w-full h-6 border-2 border-foreground bg-background relative overflow-hidden">
        <motion.div
          className={`h-full ${bgMap[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <span className="font-body text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
};

export default TelemetryGauge;
