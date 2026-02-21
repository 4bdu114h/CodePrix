import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Code2, Trophy, Zap } from "lucide-react";
import { CheckeredFlag, RacingCar, AnimatedFlag, HelmetIcon } from "@/components/RacingElements";
import SpeedCounter from "@/components/SpeedCounter";

const features = [
  { icon: Code2, title: "500+ Problems", desc: "Race through algorithmic challenges across all difficulty levels", color: "bg-secondary" },
  { icon: Zap, title: "Live Contests", desc: "Compete in timed races with real-time leaderboards", color: "bg-primary" },
  { icon: Trophy, title: "Leaderboard", desc: "Climb the ranks and earn your podium position", color: "bg-accent" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <RacingCar delay={0} />
        <RacingCar delay={2.5} />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <AnimatedFlag size={48} />
              <span className="neo-badge bg-secondary text-secondary-foreground">
                Competitive Coding Platform
              </span>
              <AnimatedFlag size={48} />
            </div>

            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black leading-none mb-2">
              Code<span className="text-primary">Prix</span>
            </h1>

            <div className="w-64 mx-auto my-4">
              <CheckeredFlag />
            </div>

            <p className="font-racing text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto mb-10">
              Code like you're racing for pole position 🏎️
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="neo-btn-primary px-8 py-3 text-base inline-flex items-center gap-2">
                Start Racing <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* Counters */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            <SpeedCounter target={12450} label="Racers" />
            <SpeedCounter target={500} label="Problems" suffix="+" />
            <SpeedCounter target={3} label="Live Races" />
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <CheckeredFlag />

      {/* Features */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-black mb-2">
              Your <span className="text-primary">Pit Crew</span> Awaits
            </h2>
            <div className="flex justify-center gap-3 mt-4">
              <HelmetIcon color="primary" />
              <HelmetIcon color="yellow" />
              <HelmetIcon color="steel" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`neo-card p-8 ${f.color}`}
              >
                <f.icon className="h-8 w-8 mb-4" />
                <h3 className="font-display text-lg font-bold mb-2 text-foreground">{f.title}</h3>
                <p className="font-body text-sm leading-relaxed opacity-80 text-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CheckeredFlag />

      {/* Footer */}
      <footer className="border-t-2 border-foreground py-8 bg-card">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span className="font-display text-sm text-foreground">
            Code<span className="text-primary">Prix</span>
          </span>
          <span className="font-body text-xs text-muted-foreground">
            © 2026 CodePrix. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
