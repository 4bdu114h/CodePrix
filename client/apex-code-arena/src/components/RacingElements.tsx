import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Animated checkered flag banner - plain in dark mode */
export const CheckeredFlag = ({ className = "" }: { className?: string }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    setIsDark(document.documentElement.classList.contains('dark'));

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (isDark) {
    return <div className={`h-6 w-full bg-muted border-y border-border ${className}`} />;
  }

  return <div className={`h-6 w-full checkered-stripe animate-checkered-scroll ${className}`} />;
};

/** Animated car SVG that drives across the screen */
export const RacingCar = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ bottom: "20%" }}
    initial={{ x: "-500px" }}
    animate={{ x: "calc(100vw + 100%)" }}
    transition={{ duration: 5, repeat: Infinity, ease: "linear", delay }}
  >
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" className="drop-shadow-md">
      {/* Body */}
      <rect x="10" y="8" width="55" height="16" rx="2" fill="hsl(350, 100%, 50%)" stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      {/* Cockpit */}
      <rect x="30" y="4" width="18" height="8" rx="1" fill="hsl(54, 100%, 50%)" stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      {/* Front wing */}
      <rect x="62" y="12" width="16" height="8" rx="1" fill="hsl(230, 40%, 8%)" />
      {/* Rear wing */}
      <rect x="4" y="6" width="4" height="20" rx="1" fill="hsl(230, 40%, 8%)" />
      <rect x="2" y="4" width="8" height="4" rx="1" fill="hsl(230, 40%, 8%)" />
      {/* Wheels */}
      <circle cx="22" cy="26" r="5" fill="hsl(230, 40%, 8%)" stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <circle cx="22" cy="26" r="2" fill="hsl(45, 30%, 96%)" />
      <circle cx="58" cy="26" r="5" fill="hsl(230, 40%, 8%)" stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <circle cx="58" cy="26" r="2" fill="hsl(45, 30%, 96%)" />
      {/* Number */}
      <text x="38" y="20" textAnchor="middle" fill="hsl(230, 40%, 8%)" fontSize="10" fontWeight="bold" fontFamily="Orbitron">1</text>
    </svg>
  </motion.div>
);

/** Animated racing stripes with neo-brutal style */
export const NeoRacingStripes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Diagonal stripes */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute h-3 border-y-2 border-foreground bg-primary"
        style={{ top: `${25 + i * 25}%`, width: "120%", left: "-10%", opacity: 0.1 }}
        animate={{ x: ["-10%", "10%", "-10%"] }}
        transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
      />
    ))}
  </div>
);

/** Flag icon animated */
export const AnimatedFlag = ({ size = 40 }: { size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    className="animate-flag-wave origin-bottom-left"
  >
    {/* Pole */}
    <rect x="4" y="4" width="3" height="34" fill="hsl(230, 40%, 8%)" rx="1" />
    {/* Flag checkered */}
    <rect x="7" y="4" width="8" height="8" fill="hsl(230, 40%, 8%)" />
    <rect x="15" y="4" width="8" height="8" fill="hsl(45, 30%, 96%)" stroke="hsl(230, 40%, 8%)" strokeWidth="1" />
    <rect x="23" y="4" width="8" height="8" fill="hsl(230, 40%, 8%)" />
    <rect x="7" y="12" width="8" height="8" fill="hsl(45, 30%, 96%)" stroke="hsl(230, 40%, 8%)" strokeWidth="1" />
    <rect x="15" y="12" width="8" height="8" fill="hsl(230, 40%, 8%)" />
    <rect x="23" y="12" width="8" height="8" fill="hsl(45, 30%, 96%)" stroke="hsl(230, 40%, 8%)" strokeWidth="1" />
    <rect x="7" y="4" width="24" height="16" fill="none" stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
  </motion.svg>
);

/** Helmet icon */
export const HelmetIcon = ({ color = "primary", size = 32 }: { color?: string; size?: number }) => {
  const fill = color === "primary" ? "hsl(350, 100%, 50%)" : color === "yellow" ? "hsl(54, 100%, 50%)" : "hsl(226, 23%, 52%)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M6 20C6 12 10 6 16 6C22 6 26 12 26 20H6Z" fill={fill} stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <rect x="4" y="18" width="24" height="6" rx="1" fill={fill} stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <rect x="18" y="14" width="8" height="4" rx="1" fill="hsl(45, 30%, 96%)" stroke="hsl(230, 40%, 8%)" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="16" y2="6" stroke="hsl(230, 40%, 8%)" strokeWidth="1.5" />
    </svg>
  );
};

export const TrophyIcon = ({ place }: { place: 1 | 2 | 3 }) => {
  const fills = { 1: "hsl(43, 100%, 50%)", 2: "hsl(0, 0%, 75%)", 3: "hsl(30, 60%, 45%)" };
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 4H20V14C20 18 17 20 14 20C11 20 8 18 8 14V4Z" fill={fills[place]} stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <rect x="11" y="20" width="6" height="4" fill={fills[place]} stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <rect x="8" y="24" width="12" height="3" fill={fills[place]} stroke="hsl(230, 40%, 8%)" strokeWidth="2" />
      <path d="M8 8H4C4 12 6 14 8 14" stroke="hsl(230, 40%, 8%)" strokeWidth="2" fill="none" />
      <path d="M20 8H24C24 12 22 14 20 14" stroke="hsl(230, 40%, 8%)" strokeWidth="2" fill="none" />
      <text x="14" y="15" textAnchor="middle" fill="hsl(230, 40%, 8%)" fontSize="8" fontWeight="bold" fontFamily="Orbitron">{place}</text>
    </svg>
  );
};
