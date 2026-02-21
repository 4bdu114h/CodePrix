import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SpeedCounterProps {
  target: number;
  label: string;
  suffix?: string;
  duration?: number;
}

const SpeedCounter = ({ target, label, suffix = "", duration = 2 }: SpeedCounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="neo-card p-6 flex flex-col items-center bg-background"
    >
      <span className="font-display text-3xl md:text-4xl font-black text-foreground">
        {count.toLocaleString()}{suffix}
      </span>
      <span className="mt-2 font-body text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </motion.div>
  );
};

export default SpeedCounter;
