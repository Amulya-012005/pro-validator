import { motion } from "framer-motion";
import { Shield, Cpu, Eye, Brain, Activity, FileImage, ChevronRight, Zap, Lock, Target, Search, Layers } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const imageSteps = [
  { icon: FileImage, label: "Upload Image", desc: "PNG, JPG, JPEG or WEBP up to 20MB via drag-and-drop or file browser" },
  { icon: Cpu, label: "Preprocessing", desc: "Normalization, resizing, and 3-crop TTA augmentation for stability" },
  { icon: Brain, label: "EfficientNet-B0", desc: "Fine-tuned CNN extracts deep GAN fingerprint features with temperature scaling" },
  { icon: Eye, label: "CLIP Zero-Shot", desc: "CLIP-ViT-B/32 semantic comparison: 'AI-generated artwork' vs 'real photograph'" },
  { icon: Search, label: "Forensic Signals", desc: "FFT spectral analysis, noise kurtosis, EXIF metadata, and color statistics" },
  { icon: Shield, label: "Ensemble Result", desc: "6 calibrated signals fused with weighted voting → REAL IMAGE or AI GENERATED" },
];

function WorkflowSteps({ steps, color }: { steps: typeof imageSteps; color: string }) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-10 bottom-10 w-px hidden sm:block" style={{ background: `linear-gradient(180deg, transparent, ${color}35, transparent)` }} />
      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-start gap-4"
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center relative z-10 mt-0.5"
                style={{ background: `${color}14`, border: `1px solid ${color}40`, boxShadow: `0 0 18px ${color}22` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <motion.div whileHover={{ x: 4 }} className="flex-1 glass-card rounded-xl p-3 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: `${color}75` }}>0{i + 1}</span>
                  <ChevronRight className="w-3 h-3" style={{ color: `${color}55` }} />
                  <span className="text-sm font-semibold text-white font-sora">{step.label}</span>
                </div>
                <p className="text-xs text-[rgba(180,210,255,0.45)] font-sora">{step.desc}</p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const techCards = [
  { name: "CLIP ViT-B/32", desc: "OpenAI's contrastive vision-language model used for zero-shot AI vs. real photo classification (30% weight)", color: "#00d4ff", icon: Brain },
  { name: "EfficientNet-B0", desc: "Fine-tuned CNN with 3-crop TTA ensemble and temperature scaling — identifies GAN and diffusion fingerprints (20%)", color: "#a855f7", icon: Target },
  { name: "FFT Spectral Analysis", desc: "Natural images follow 1/f² power spectrum; AI images exhibit a flatter frequency profile — detected with FFT (18%)", color: "#ec4899", icon: Zap },
  { name: "Noise Kurtosis", desc: "Real cameras have heavy-tailed Poisson shot noise; diffusion models produce unnaturally smooth residuals (17%)", color: "#10b981", icon: Eye },
  { name: "EXIF Forensics", desc: "Real photographs carry camera Make/Model/ISO/GPS; AI images lack EXIF or contain generator software tags (10%)", color: "#f59e0b", icon: Lock },
  { name: "Color & Texture Stats", desc: "AI images often show hyper-vivid saturation, patch uniformity, and unusual RGB channel cross-correlations (5%)", color: "#06b6d4", icon: Activity },
];

export default function About() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-7 font-sora"
              style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.30)", color: "#00d4ff", boxShadow: "0 0 24px rgba(0,212,255,0.14)" }}
            >
              <Shield className="w-3.5 h-3.5" /> AI Forensic Security System
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 font-sora">About ProValidator</h1>
            <p className="text-[rgba(180,210,255,0.50)] max-w-2xl mx-auto leading-relaxed font-sora">
              ProValidator is a next-generation AI media authentication platform that uses a calibrated 6-signal ensemble neural network to detect synthetic imagery with forensic-grade precision.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-sora">
              <Brain className="w-5 h-5 text-[#00d4ff]" /> How It Works
            </h2>
            <p className="text-[rgba(180,210,255,0.60)] text-sm leading-relaxed mb-3 font-sora">
              ProValidator uses a multi-stage 6-signal ensemble pipeline combining CLIP zero-shot classification, CNN-based deep feature extraction, FFT frequency analysis, sensor noise forensics, EXIF metadata examination, and color statistics — all fused with calibrated weighted voting.
            </p>
            <p className="text-[rgba(180,210,255,0.60)] text-sm leading-relaxed font-sora">
              Each uploaded image is analyzed simultaneously by all 6 signals. Results are labeled as{" "}
              <span className="text-[#10b981] font-mono text-xs px-1 py-0.5 rounded bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">REAL IMAGE</span>{" "}
              or{" "}
              <span className="text-[#f59e0b] font-mono text-xs px-1 py-0.5 rounded bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)]">AI GENERATED IMAGE</span>
              {" "}with a calibrated confidence score and inter-signal agreement metric. When signals strongly disagree, the system returns{" "}
              <span className="text-[#64748b] font-mono text-xs px-1 py-0.5 rounded bg-[rgba(100,116,139,0.08)] border border-[rgba(100,116,139,0.2)]">UNCERTAIN</span>.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5 mb-10">
            <h3 className="text-sm font-semibold text-[#00d4ff] mb-3 uppercase tracking-wider font-sora">Supported Image Formats</h3>
            <div className="flex flex-wrap gap-3">
              {["PNG", "JPG / JPEG", "WEBP"].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.18)" }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#00d4ff]" style={{ boxShadow: "0 0 8px rgba(0,212,255,0.8)" }} />
                  <span className="text-sm text-[rgba(200,220,255,0.75)] font-mono">{f}</span>
                </div>
              ))}
              <div className="flex items-center px-4 py-2 rounded-xl" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)" }}>
                <span className="text-xs text-[rgba(168,85,247,0.75)] font-sora">Max 20MB per file</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest font-sora">6-Signal Detection Pipeline</h2>
            </div>
            <WorkflowSteps steps={imageSteps} color="#00d4ff" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-6">
              <Cpu className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest font-sora">AI Technology Stack</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {techCards.map((tech, i) => {
                const Icon = tech.icon;
                return (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="glass-card rounded-2xl p-4 transition-all duration-200"
                    style={{ borderColor: `${tech.color}20` }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${tech.color}14`, border: `1px solid ${tech.color}35` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: tech.color }} />
                      </div>
                      <div className="text-sm font-bold font-sora" style={{ color: tech.color }}>{tech.name}</div>
                    </div>
                    <p className="text-xs text-[rgba(180,210,255,0.45)] leading-relaxed font-sora">{tech.desc}</p>
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
