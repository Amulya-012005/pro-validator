import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Scan, Activity, Shield, Cpu, AlertTriangle, Zap, Eye, Lock, Layers } from "lucide-react";
import { useGetAnalytics } from "@workspace/api-client-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

function AnimatedCounter({ value, label, icon: Icon, color }: {
  value: number | string; label: string; icon: any; color: string;
}) {
  const isNumeric = typeof value === "number";
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isNumeric) return;
    const numVal = value as number;
    const duration = 1400;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor(eased * numVal));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, isNumeric]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.03, y: -3 }}
      className="glass-card rounded-2xl p-6 flex items-center gap-4 cursor-default transition-all duration-300 group"
      style={{ borderColor: `${color}28` }}
      data-testid={`card-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
        style={{
          background: `${color}14`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 24px ${color}25`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div
          className="text-3xl font-bold font-orbitron"
          style={{ color, textShadow: `0 0 18px ${color}70` }}
          data-testid={`value-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          {isNumeric ? displayed.toLocaleString() : value}
        </div>
        <div className="text-xs text-[rgba(180,210,255,0.50)] uppercase tracking-widest mt-1 font-sora">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

const features = [
  {
    icon: Eye,
    title: "6-Signal Ensemble Detection",
    desc: "CLIP embeddings, EfficientNet-B0, FFT spectral analysis, noise forensics, EXIF metadata, and color statistics work together for maximum accuracy",
    color: "#00d4ff",
  },
  {
    icon: Zap,
    title: "Real-Time Analysis",
    desc: "Process images in seconds with our optimized persistent inference pipeline and 3-crop Test-Time Augmentation ensemble",
    color: "#a855f7",
  },
  {
    icon: Lock,
    title: "Forensic Confidence Scoring",
    desc: "Every prediction comes with calibrated confidence scores, uncertainty flags, inter-signal agreement metrics, and detailed explanations",
    color: "#ec4899",
  },
];

export default function Home() {
  const { data: analytics } = useGetAnalytics();

  const stats = [
    { label: "Images Analyzed", value: analytics?.totalImages ?? 0, icon: Scan, color: "#00d4ff" },
    { label: "AI Detected", value: analytics?.totalAiGenerated ?? 0, icon: AlertTriangle, color: "#f59e0b" },
    { label: "Verified Real", value: analytics?.totalReal ?? 0, icon: Shield, color: "#10b981" },
    { label: "Active Signals", value: "6", icon: Layers, color: "#a855f7" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase font-sora"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.30)",
                color: "#00d4ff",
                boxShadow: "0 0 24px rgba(0,212,255,0.18)",
              }}
            >
              <Cpu className="w-3.5 h-3.5" />
              Next-Generation AI Forensics Platform
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-center mb-7"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight font-sora">
              <span className="text-white">Detect</span>
              <br />
              <span className="shimmer-text">Deepfakes & AI Images</span>
              <br />
              <span className="text-white">Instantly</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-[rgba(200,220,255,0.55)] text-lg max-w-2xl mx-auto mb-14 leading-relaxed font-sora"
          >
            Military-grade 6-signal ensemble analysis identifies AI-generated images
            with forensic precision — CLIP embeddings, spectral fingerprints, noise patterns,
            and EXIF metadata combined for maximum accuracy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-24"
          >
            <Link href="/detect-image">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="neon-btn-blue px-12 py-5 rounded-2xl font-semibold text-lg flex items-center gap-3 justify-center min-w-[260px]"
                data-testid="button-detect-image"
              >
                <Scan className="w-5 h-5" />
                Analyze Image Now
              </motion.button>
            </Link>
            <Link href="/history">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="neon-btn-purple px-12 py-5 rounded-2xl font-semibold text-lg flex items-center gap-3 justify-center min-w-[260px]"
                data-testid="button-view-history"
              >
                <Activity className="w-5 h-5" />
                View History
              </motion.button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-4 h-4 text-[rgba(0,212,255,0.6)]" />
              <span className="text-xs text-[rgba(180,210,255,0.45)] uppercase tracking-widest font-mono">
                Live Statistics
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(0,212,255,0.25)] to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <AnimatedCounter {...s} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-4 h-4 text-[rgba(168,85,247,0.6)]" />
              <span className="text-xs text-[rgba(180,210,255,0.45)] uppercase tracking-widest font-mono">
                Platform Capabilities
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(168,85,247,0.25)] to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="glass-card rounded-2xl p-6 cursor-default transition-all duration-300"
                    style={{ borderColor: `${f.color}20` }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: `${f.color}14`,
                        border: `1px solid ${f.color}35`,
                        boxShadow: `0 0 18px ${f.color}18`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-white font-semibold mb-2 font-sora text-sm">{f.title}</h3>
                    <p className="text-[rgba(180,210,255,0.50)] text-xs leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
