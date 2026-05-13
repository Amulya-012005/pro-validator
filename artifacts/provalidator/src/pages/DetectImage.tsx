import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Upload, X, Scan, RotateCcw, ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAnalyticsQueryKey, getGetHistoryQueryKey } from "@workspace/api-client-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

interface DetectionResult {
  id: number;
  fileName: string;
  fileType: string;
  prediction: "ai_generated" | "real";
  label?: string;
  aiGeneratedPercent: number;
  realPercent: number;
  confidenceScore: number;
  explanation: string;
  framesAnalyzed: number | null;
  timestamp: string;
}

function ScanningAnimation() {
  const steps = ["PREPROCESSING", "CLIP ANALYSIS", "SPECTRAL FFT", "NOISE FORENSICS", "ENSEMBLE FUSION"];

  return (
    <div className="flex flex-col items-center gap-6 py-14">
      <div className="relative w-36 h-36">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-[#00d4ff]"
            animate={{ scale: [1, 2.4], opacity: [0.9, 0] }}
            transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.45)",
            boxShadow: "0 0 50px rgba(0,212,255,0.35), inset 0 0 24px rgba(0,212,255,0.07)",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            <Scan className="w-14 h-14 text-[#00d4ff]" />
          </motion.div>
        </div>
      </div>

      <div className="text-center">
        <motion.p
          className="font-mono text-sm tracking-widest font-bold"
          style={{ color: "#00d4ff", textShadow: "0 0 16px rgba(0,212,255,0.8)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ANALYZING NEURAL PATTERNS...
        </motion.p>
        <p className="text-[rgba(180,210,255,0.40)] text-xs mt-2 font-sora">
          Running 6-signal ensemble forensic analysis
        </p>
      </div>

      <div className="w-80 h-1.5 rounded-full overflow-hidden bg-[rgba(0,212,255,0.08)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #a855f7, #ec4899, transparent)" }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="grid grid-cols-5 gap-2 text-center">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2.0, delay: i * 0.4, repeat: Infinity }}
            className="text-[9px] text-[rgba(180,210,255,0.50)] uppercase tracking-wider font-mono"
          >
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RadialProgress({ percent, color, label }: { percent: number; color: string; label: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(200,220,255,0.06)" strokeWidth="7" />
          <motion.circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color, textShadow: `0 0 14px ${color}90` }}>
            {percent.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-[rgba(180,210,255,0.50)] uppercase tracking-wider font-sora">{label}</span>
    </div>
  );
}

function getResultBadge(label: string) {
  if (label === "uncertain") {
    return {
      text: "UNCERTAIN",
      color: "#64748b",
      bg: "rgba(100,116,139,0.08)",
      border: "rgba(100,116,139,0.28)",
      icon: HelpCircle,
    };
  }
  if (label === "ai_generated" || label === "ai-generated") {
    return {
      text: "AI GENERATED IMAGE",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.30)",
      icon: AlertTriangle,
    };
  }
  return {
    text: "REAL IMAGE",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.30)",
    icon: CheckCircle,
  };
}

export default function DetectImage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFile = (f: File) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type)) {
      setError("Invalid format. Allowed: PNG, JPG, JPEG, WEBP");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File too large. Max 20MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl = import.meta.env.BASE_URL;
      const response = await fetch(`${baseUrl}api/detect-image`, { method: "POST", body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data: DetectionResult = await response.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const effectiveLabel = result?.label ?? result?.prediction ?? "real";
  const badge = result ? getResultBadge(effectiveLabel) : null;

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/">
              <button
                className="flex items-center gap-2 text-[rgba(180,210,255,0.40)] hover:text-[#00d4ff] text-sm mb-6 transition-colors font-sora"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center animate-glow-pulse"
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.40)", boxShadow: "0 0 24px rgba(0,212,255,0.20)" }}
              >
                <Scan className="w-5 h-5 text-[#00d4ff]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-sora">Image Detector</h1>
                <p className="text-[rgba(180,210,255,0.40)] text-xs font-mono tracking-widest uppercase">
                  6-Signal AI Generation Analysis
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              className="glass-card rounded-2xl p-6 mb-4 transition-all duration-300"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                borderColor: dragging ? "rgba(0,212,255,0.70)" : undefined,
                boxShadow: dragging ? "0 0 50px rgba(0,212,255,0.20)" : undefined,
              }}
            >
              {!preview ? (
                <div
                  className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 cursor-pointer transition-all duration-300 group"
                  style={{ borderColor: dragging ? "rgba(0,212,255,0.60)" : "rgba(80,160,255,0.22)" }}
                  onClick={() => inputRef.current?.click()}
                  data-testid="dropzone-image"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-glow-pulse"
                    style={{
                      background: "rgba(0,212,255,0.08)",
                      border: "1px solid rgba(0,212,255,0.35)",
                      boxShadow: "0 0 30px rgba(0,212,255,0.20)",
                    }}
                  >
                    <Upload className="w-9 h-9 text-[#00d4ff]" />
                  </motion.div>
                  <p className="text-white font-semibold mb-2 font-sora text-lg">Drop image here or click to browse</p>
                  <p className="text-[rgba(180,210,255,0.40)] text-sm font-mono">PNG · JPG · JPEG · WEBP — Max 20MB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                    data-testid="input-image-file"
                  />
                </div>
              ) : (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-80 object-contain rounded-xl" data-testid="img-preview" />
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(7,9,28,0.88)", border: "1px solid rgba(0,212,255,0.40)" }}
                    data-testid="button-remove-image"
                  >
                    <X className="w-4 h-4 text-[#00d4ff]" />
                  </button>
                  <p className="text-[rgba(180,210,255,0.45)] text-xs mt-3 font-mono truncate">{file?.name}</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171" }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                disabled={!file || analyzing}
                onClick={analyze}
                className="neon-btn-blue flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="button-analyze-image"
              >
                <Scan className="w-4 h-4" />
                {analyzing ? "Analyzing..." : "Analyze Image"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="neon-btn-purple px-6 py-4 rounded-2xl font-medium flex items-center gap-2"
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl mt-6"
              >
                <ScanningAnimation />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && badge && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl mt-6 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${badge.color}55, transparent)` }} />
                  <span className="text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5" style={{ color: badge.color }}>
                    <Sparkles className="w-3 h-3" />
                    Analysis Complete
                  </span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${badge.color}55)` }} />
                </div>

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="rounded-2xl p-5 mb-6 flex items-center gap-4"
                  style={{
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    boxShadow: `0 0 40px ${badge.color}14`,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 animate-glow-pulse"
                    style={{ background: `${badge.color}14`, border: `1px solid ${badge.border}` }}
                  >
                    <badge.icon className="w-7 h-7" style={{ color: badge.color }} />
                  </div>
                  <div>
                    <div
                      className="font-bold text-2xl font-orbitron tracking-wider"
                      style={{ color: badge.color, textShadow: `0 0 24px ${badge.color}70` }}
                    >
                      {badge.text}
                    </div>
                    <div className="text-[rgba(180,210,255,0.55)] text-sm mt-1 font-sora">
                      {effectiveLabel === "uncertain"
                        ? `Low confidence — signals disagree (${result.confidenceScore}%)`
                        : effectiveLabel === "ai_generated"
                          ? `${result.aiGeneratedPercent}% probability this image is AI-generated`
                          : `${result.realPercent}% probability this is a real photograph`}
                    </div>
                  </div>
                </motion.div>

                <div className="flex justify-center gap-10 mb-7">
                  <RadialProgress percent={result.aiGeneratedPercent} color="#f59e0b" label="AI Generated" />
                  <RadialProgress percent={result.realPercent} color="#10b981" label="Authentic" />
                  <RadialProgress percent={result.confidenceScore} color="#00d4ff" label="Confidence" />
                </div>

                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}
                >
                  <p className="text-xs text-[rgba(0,212,255,0.60)] uppercase tracking-widest mb-2 font-mono">Forensic Analysis Report</p>
                  <p className="text-[rgba(200,220,255,0.80)] text-sm leading-relaxed font-sora">{result.explanation}</p>
                </div>

                <div className="text-xs text-[rgba(180,210,255,0.28)] font-mono text-right">
                  {new Date(result.timestamp).toLocaleString()} · {result.fileName}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
