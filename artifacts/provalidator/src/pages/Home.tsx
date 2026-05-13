import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Scan, Video, Activity, Shield, Cpu, AlertTriangle } from "lucide-react";
import { useGetAnalytics } from "@workspace/api-client-react";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }[] = [];
    const colors = ["#00d4ff", "#a855f7", "#06b6d4", "#7c3aed"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

function AnimatedCounter({ value, label, icon: Icon, color }: {
  value: number; label: string; icon: any; color: string;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-xl p-6 flex items-center gap-4 hover:border-[rgba(0,212,255,0.3)] transition-all"
      data-testid={`card-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}40` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div
          className="text-2xl font-bold font-mono"
          style={{ color, textShadow: `0 0 10px ${color}60` }}
          data-testid={`value-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          {displayed.toLocaleString()}
        </div>
        <div className="text-xs text-[rgba(226,232,240,0.5)] uppercase tracking-widest mt-0.5">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { data: analytics } = useGetAnalytics();

  const stats = [
    { label: "Images Analyzed", value: analytics?.totalImages ?? 0, icon: Scan, color: "#00d4ff" },
    { label: "Videos Analyzed", value: analytics?.totalVideos ?? 0, icon: Video, color: "#a855f7" },
    { label: "AI Generated", value: analytics?.totalAiGenerated ?? 0, icon: AlertTriangle, color: "#f59e0b" },
    { label: "Real Media", value: analytics?.totalReal ?? 0, icon: Shield, color: "#10b981" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#060a14" }}>
      {/* Animated background */}
      <div className="absolute inset-0 cyber-grid opacity-60" />
      <div className="absolute inset-0">
        <ParticleCanvas />
      </div>

      {/* Radial glow backgrounds */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #00d4ff, transparent)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #a855f7, transparent)" }}
      />

      <div className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.25)",
                color: "#00d4ff",
              }}
            >
              <Cpu className="w-3 h-3" />
              Next-Generation AI Security Platform
            </div>
          </motion.div>

          {/* Hero heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-center mb-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="text-white">Advanced AI-Powered</span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Fake Image & Deepfake
              </span>
              <br />
              <span className="text-white">Video Detection</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-[rgba(226,232,240,0.5)] text-lg max-w-2xl mx-auto mb-12"
          >
            Military-grade neural network analysis to identify AI-generated images and deepfake videos
            with unmatched precision and confidence scoring.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
          >
            <Link href="/detect-image">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="neon-btn-blue px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 justify-center min-w-[220px]"
                data-testid="button-detect-image"
              >
                <Scan className="w-5 h-5" />
                Detect Image
              </motion.button>
            </Link>
            <Link href="/detect-video">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="neon-btn-purple px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 justify-center min-w-[220px]"
                data-testid="button-detect-video"
              >
                <Video className="w-5 h-5" />
                Detect Video
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-4 h-4 text-[rgba(0,212,255,0.6)]" />
              <span className="text-xs text-[rgba(226,232,240,0.4)] uppercase tracking-widest">
                Live Statistics
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(0,212,255,0.2)] to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <AnimatedCounter key={s.label} {...s} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
