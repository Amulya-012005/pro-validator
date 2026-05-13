import { motion } from "framer-motion";
import { Shield, Cpu, Eye, Brain, Activity, FileImage, Film, ChevronRight } from "lucide-react";

const imageSteps = [
  { icon: FileImage, label: "Upload Image", desc: "PNG, JPG, JPEG or WEBP up to 20MB" },
  { icon: Cpu, label: "AI Preprocessing", desc: "Normalization, resizing, EXIF analysis" },
  { icon: Brain, label: "Neural Analysis", desc: "EfficientNet deep feature extraction" },
  { icon: Eye, label: "Pattern Detection", desc: "GAN fingerprint and artifact identification" },
  { icon: Activity, label: "Prediction Engine", desc: "Probability scoring and confidence calc" },
  { icon: Shield, label: "Final Result", desc: "Detailed report with confidence score" },
];

const videoSteps = [
  { icon: Film, label: "Upload Video", desc: "MP4, MOV or AVI up to 200MB" },
  { icon: Cpu, label: "Frame Extraction", desc: "Key frame sampling via temporal analysis" },
  { icon: Eye, label: "Deepfake Analysis", desc: "Face detection and boundary inspection" },
  { icon: Brain, label: "Artifact Detection", desc: "CNN+LSTM temporal inconsistency scan" },
  { icon: Activity, label: "Confidence Calculation", desc: "Frame-level aggregation and scoring" },
  { icon: Shield, label: "Final Result", desc: "Frame report with deepfake probability" },
];

function WorkflowSteps({ steps, color }: { steps: typeof imageSteps; color: string }) {
  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-5 top-10 bottom-10 w-px hidden sm:block" style={{ background: `linear-gradient(180deg, transparent, ${color}40, transparent)` }} />
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
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative z-10 mt-0.5" style={{ background: `${color}15`, border: `1px solid ${color}40`, boxShadow: `0 0 12px ${color}20` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 glass-card rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: `${color}80` }}>0{i + 1}</span>
                  <ChevronRight className="w-3 h-3" style={{ color: `${color}60` }} />
                  <span className="text-sm font-semibold text-white">{step.label}</span>
                </div>
                <p className="text-xs text-[rgba(226,232,240,0.4)]">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const techCards = [
  { name: "EfficientNet", desc: "State-of-the-art CNN architecture for AI image pattern classification", color: "#00d4ff" },
  { name: "ResNet-50", desc: "Deep residual network for pixel-level artifact feature extraction", color: "#a855f7" },
  { name: "HuggingFace Models", desc: "Pretrained fake image detection transformers", color: "#06b6d4" },
  { name: "OpenCV", desc: "Computer vision preprocessing and frame extraction pipeline", color: "#10b981" },
  { name: "CNN+LSTM", desc: "Temporal sequence analysis for deepfake video detection", color: "#f59e0b" },
  { name: "DeepFace", desc: "Face detection and facial landmark analysis for boundary inspection", color: "#ef4444" },
];

export default function About() {
  return (
    <div className="min-h-screen" style={{ background: "#060a14" }}>
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-6" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff" }}>
              <Shield className="w-3 h-3" /> AI Security System
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">About ProValidator</h1>
            <p className="text-[rgba(226,232,240,0.5)] max-w-2xl mx-auto leading-relaxed">
              ProValidator is a next-generation AI media authentication platform that uses advanced neural networks to detect synthetic imagery and deepfake videos with forensic-grade precision.
            </p>
          </motion.div>

          {/* What is ProValidator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#00d4ff]" /> How It Works
            </h2>
            <p className="text-[rgba(226,232,240,0.6)] text-sm leading-relaxed mb-3">
              ProValidator uses a multi-stage detection pipeline combining frequency-domain analysis, CNN-based feature extraction, and temporal consistency checks. Each uploaded file is processed through specialized neural networks trained on millions of real and synthetic media samples.
            </p>
            <p className="text-[rgba(226,232,240,0.6)] text-sm leading-relaxed">
              The system returns a confidence-scored prediction with detailed explanations, helping you understand exactly why media was flagged as AI-generated or authentic.
            </p>
          </motion.div>

          {/* Formats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#00d4ff] mb-3 uppercase tracking-wider">Image Formats</h3>
              {["PNG", "JPG / JPEG", "WEBP"].map((f) => (
                <div key={f} className="flex items-center gap-2 py-1.5 border-b border-[rgba(0,212,255,0.06)] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
                  <span className="text-sm text-[rgba(226,232,240,0.7)] font-mono">{f}</span>
                </div>
              ))}
              <p className="text-xs text-[rgba(226,232,240,0.3)] mt-2">Max 20MB per file</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#a855f7] mb-3 uppercase tracking-wider">Video Formats</h3>
              {["MP4", "MOV (QuickTime)", "AVI"].map((f) => (
                <div key={f} className="flex items-center gap-2 py-1.5 border-b border-[rgba(168,85,247,0.06)] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                  <span className="text-sm text-[rgba(226,232,240,0.7)] font-mono">{f}</span>
                </div>
              ))}
              <p className="text-xs text-[rgba(226,232,240,0.3)] mt-2">Max 200MB per file</p>
            </div>
          </motion.div>

          {/* Workflow steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-5">
                <FileImage className="w-4 h-4 text-[#00d4ff]" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Image Detection Workflow</h2>
              </div>
              <WorkflowSteps steps={imageSteps} color="#00d4ff" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <div className="flex items-center gap-2 mb-5">
                <Film className="w-4 h-4 text-[#a855f7]" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Video Detection Workflow</h2>
              </div>
              <WorkflowSteps steps={videoSteps} color="#a855f7" />
            </motion.div>
          </div>

          {/* Tech stack */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00d4ff]" /> AI Technology Stack
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {techCards.map((tech, i) => (
                <motion.div key={tech.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className="glass-card rounded-xl p-4 hover:border-[rgba(0,212,255,0.2)] transition-all">
                  <div className="text-sm font-bold mb-1" style={{ color: tech.color }}>{tech.name}</div>
                  <p className="text-xs text-[rgba(226,232,240,0.4)] leading-relaxed">{tech.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
