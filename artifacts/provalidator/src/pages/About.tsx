import { motion } from "framer-motion";
import { Shield, Cpu, Eye, Brain, Activity, FileImage, Film, ChevronRight, Zap, Lock, Target } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const imageSteps = [
  { icon: FileImage, label: "Upload Image", desc: "PNG, JPG, JPEG or WEBP up to 20MB" },
  { icon: Cpu, label: "AI Preprocessing", desc: "Normalization, resizing, and TTA augmentation" },
  { icon: Brain, label: "Neural Analysis", desc: "EfficientNet ensemble deep feature extraction" },
  { icon: Eye, label: "Pattern Detection", desc: "GAN fingerprint and texture anomaly identification" },
  { icon: Activity, label: "Calibrated Scoring", desc: "Temperature-scaled probability confidence estimation" },
  { icon: Shield, label: "Final Result", desc: "Detailed report: REAL IMAGE or AI GENERATED IMAGE" },
];

const videoSteps = [
  { icon: Film, label: "Upload Video", desc: "MP4, MOV or AVI up to 200MB" },
  { icon: Cpu, label: "Frame Extraction", desc: "Key frame sampling and JPEG extraction" },
  { icon: Eye, label: "Frame Analysis", desc: "Per-frame ML model inference and face detection" },
  { icon: Brain, label: "Temporal Analysis", desc: "Cross-frame consistency and artifact scanning" },
  { icon: Activity, label: "Frame Averaging", desc: "Multi-frame aggregation for stable prediction" },
  { icon: Shield, label: "Final Result", desc: "Frame report: REAL VIDEO or DEEPFAKE VIDEO" },
];

function WorkflowSteps({ steps, color }: { steps: typeof imageSteps; color: string }) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-10 bottom-10 w-px hidden sm:block" style={{ background: `linear-gradient(180deg, transparent, ${color}30, transparent)` }} />
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
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center relative z-10 mt-0.5" style={{ background: `${color}12`, border: `1px solid ${color}35`, boxShadow: `0 0 15px ${color}18` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <motion.div whileHover={{ x: 4 }} className="flex-1 glass-card rounded-xl p-3 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: `${color}70` }}>0{i + 1}</span>
                  <ChevronRight className="w-3 h-3" style={{ color: `${color}50` }} />
                  <span className="text-sm font-semibold text-white font-sora">{step.label}</span>
                </div>
                <p className="text-xs text-[rgba(226,232,240,0.38)] font-sora">{step.desc}</p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const techCards = [
  { name: "EfficientNet-B0", desc: "State-of-the-art CNN architecture for AI image pattern classification with TTA ensemble", color: "#00d4ff", icon: Brain },
  { name: "Temperature Scaling", desc: "Confidence calibration technique that prevents overconfident 99–100% predictions", color: "#a855f7", icon: Target },
  { name: "TTA Ensemble", desc: "Test-Time Augmentation across 3 augmented views for more stable and reliable predictions", color: "#ec4899", icon: Zap },
  { name: "JPEG Frame Mining", desc: "Binary-level JPEG frame extraction from video buffers for ML-based analysis", color: "#10b981", icon: Film },
  { name: "Stable Heuristics", desc: "Deterministic hash-based scoring ensures consistent results for the same video input", color: "#f59e0b", icon: Lock },
  { name: "Real-time Inference", desc: "Persistent Python worker with stdin/stdout JSON protocol for sub-second warm predictions", color: "#06b6d4", icon: Activity },
];

export default function About() {
  return (
    <div className="min-h-screen relative" style={{ background: "#050810" }}>
      <AnimatedBackground />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-7 font-sora"
              style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff", boxShadow: "0 0 20px rgba(0,212,255,0.1)" }}
            >
              <Shield className="w-3.5 h-3.5" /> AI Security System
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 font-sora">About ProValidator</h1>
            <p className="text-[rgba(226,232,240,0.45)] max-w-2xl mx-auto leading-relaxed font-sora">
              ProValidator is a next-generation AI media authentication platform that uses calibrated neural networks and ensemble inference to detect synthetic imagery and deepfake videos with forensic-grade precision.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-sora">
              <Brain className="w-5 h-5 text-[#00d4ff]" /> How It Works
            </h2>
            <p className="text-[rgba(226,232,240,0.55)] text-sm leading-relaxed mb-3 font-sora">
              ProValidator uses a multi-stage detection pipeline combining frequency-domain analysis, CNN-based feature extraction, and temperature-calibrated confidence scoring. Each uploaded file is processed through an EfficientNet-B0 model trained specifically on real vs. synthetic media.
            </p>
            <p className="text-[rgba(226,232,240,0.55)] text-sm leading-relaxed font-sora">
              For images, Test-Time Augmentation (TTA) runs three augmented variants and averages the results for stability. For videos, the system attempts JPEG frame extraction from the binary stream, falling back to deterministic heuristics for compressed formats. Results are labeled as <span className="text-[#00d4ff] font-mono text-xs">REAL IMAGE</span>, <span className="text-[#f59e0b] font-mono text-xs">AI GENERATED IMAGE</span>, <span className="text-[#10b981] font-mono text-xs">REAL VIDEO</span>, <span className="text-[#f59e0b] font-mono text-xs">DEEPFAKE VIDEO</span>, or <span className="text-[#f59e0b] font-mono text-xs">UNCERTAIN</span>.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[#00d4ff] mb-3 uppercase tracking-wider font-sora">Image Formats</h3>
              {["PNG", "JPG / JPEG", "WEBP"].map((f) => (
                <div key={f} className="flex items-center gap-2 py-2 border-b border-[rgba(0,212,255,0.06)] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#00d4ff]" style={{ boxShadow: "0 0 6px rgba(0,212,255,0.6)" }} />
                  <span className="text-sm text-[rgba(226,232,240,0.65)] font-mono">{f}</span>
                </div>
              ))}
              <p className="text-xs text-[rgba(226,232,240,0.25)] mt-3 font-sora">Max 20MB per file</p>
            </div>
            <div className="glass-card-purple rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[#a855f7] mb-3 uppercase tracking-wider font-sora">Video Formats</h3>
              {["MP4", "MOV (QuickTime)", "AVI"].map((f) => (
                <div key={f} className="flex items-center gap-2 py-2 border-b border-[rgba(168,85,247,0.06)] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7]" style={{ boxShadow: "0 0 6px rgba(168,85,247,0.6)" }} />
                  <span className="text-sm text-[rgba(226,232,240,0.65)] font-mono">{f}</span>
                </div>
              ))}
              <p className="text-xs text-[rgba(226,232,240,0.25)] mt-3 font-sora">Max 200MB per file</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-6">
                <FileImage className="w-4 h-4 text-[#00d4ff]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest font-sora">Image Detection Workflow</h2>
              </div>
              <WorkflowSteps steps={imageSteps} color="#00d4ff" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <div className="flex items-center gap-2 mb-6">
                <Film className="w-4 h-4 text-[#a855f7]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest font-sora">Video Detection Workflow</h2>
              </div>
              <WorkflowSteps steps={videoSteps} color="#a855f7" />
            </motion.div>
          </div>

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
                    whileHover={{ scale: 1.02, y: -3 }}
                    className="glass-card rounded-2xl p-4 transition-all duration-200"
                    style={{ borderColor: `${tech.color}18` }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tech.color}12`, border: `1px solid ${tech.color}30` }}>
                        <Icon className="w-4 h-4" style={{ color: tech.color }} />
                      </div>
                      <div className="text-sm font-bold font-sora" style={{ color: tech.color }}>{tech.name}</div>
                    </div>
                    <p className="text-xs text-[rgba(226,232,240,0.38)] leading-relaxed font-sora">{tech.desc}</p>
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
