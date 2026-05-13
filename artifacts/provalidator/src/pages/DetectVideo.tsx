import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Upload, X, Video, RotateCcw, ArrowLeft, CheckCircle, AlertTriangle, Film, HelpCircle } from "lucide-react";
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

function VideoScanAnimation() {
  return (
    <div className="flex flex-col items-center gap-6 py-14">
      <div className="relative w-44 h-28 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.04)" }}>
        <motion.div
          className="absolute left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #a855f7, #ec4899, transparent)", boxShadow: "0 0 12px rgba(168,85,247,0.9)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Film className="w-10 h-10 text-[rgba(168,85,247,0.5)]" />
          </motion.div>
        </div>
        {[["top-1.5 left-1.5", "border-t border-l"], ["top-1.5 right-1.5", "border-t border-r"], ["bottom-1.5 left-1.5", "border-b border-l"], ["bottom-1.5 right-1.5", "border-b border-r"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute w-4 h-4 ${pos} ${borders}`} style={{ borderColor: "#a855f7" }} />
        ))}
      </div>

      <div className="text-center">
        <motion.p className="text-[#a855f7] font-mono text-sm tracking-widest font-semibold" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          EXTRACTING & ANALYZING FRAMES...
        </motion.p>
        <p className="text-[rgba(226,232,240,0.35)] text-xs mt-2 font-sora">Deepfake neural analysis in progress</p>
      </div>

      <div className="w-72 h-1.5 rounded-full overflow-hidden bg-[rgba(168,85,247,0.08)]">
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, #a855f7, #ec4899, transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {["FRAME EXTRACT", "FACE DETECT", "ARTIFACT SCAN", "CONFIDENCE"].map((step, i) => (
          <motion.div key={step} animate={{ opacity: [0.15, 1, 0.15] }} transition={{ duration: 2.2, delay: i * 0.55, repeat: Infinity }} className="text-[9px] text-[rgba(168,85,247,0.7)] uppercase tracking-wider text-center font-mono">
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
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(226,232,240,0.06)" strokeWidth="7" />
          <motion.circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.4, ease: "easeOut" }} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color, textShadow: `0 0 10px ${color}80` }}>{percent.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-xs text-[rgba(226,232,240,0.45)] uppercase tracking-wider font-sora">{label}</span>
    </div>
  );
}

function getResultBadge(label: string) {
  if (label === "uncertain") {
    return { text: "UNCERTAIN", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: HelpCircle };
  }
  if (label === "ai_generated") {
    return { text: "DEEPFAKE VIDEO", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: AlertTriangle };
  }
  return { text: "REAL VIDEO", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)", icon: CheckCircle };
}

export default function DetectVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFile = (f: File) => {
    const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/avi"];
    if (!allowed.includes(f.type)) {
      setError("Invalid format. Allowed: MP4, MOV, AVI");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setError("File too large. Max 200MB.");
      return;
    }
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
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
    setVideoUrl(null);
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
      const response = await fetch(`${baseUrl}api/detect-video`, { method: "POST", body: formData });
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
    <div className="min-h-screen relative" style={{ background: "#050810" }}>
      <AnimatedBackground />

      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/">
              <button className="flex items-center gap-2 text-[rgba(226,232,240,0.35)] hover:text-[#a855f7] text-sm mb-6 transition-colors font-sora" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-glow-pulse-purple" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <Video className="w-5 h-5 text-[#a855f7]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-sora">Video Detector</h1>
                <p className="text-[rgba(226,232,240,0.35)] text-xs font-mono tracking-widest uppercase">Deepfake Frame Analysis</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              className="glass-card-purple rounded-2xl p-6 mb-4 transition-all duration-300"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                borderColor: dragging ? "rgba(168,85,247,0.6)" : undefined,
                boxShadow: dragging ? "0 0 40px rgba(168,85,247,0.15)" : undefined,
              }}
            >
              {!videoUrl ? (
                <div
                  className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 cursor-pointer transition-all duration-300"
                  style={{ borderColor: dragging ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.18)" }}
                  onClick={() => inputRef.current?.click()}
                  data-testid="dropzone-video"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-glow-pulse-purple"
                    style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.28)" }}
                  >
                    <Upload className="w-9 h-9 text-[#a855f7]" />
                  </motion.div>
                  <p className="text-white font-semibold mb-2 font-sora text-lg">Drop video here or click to browse</p>
                  <p className="text-[rgba(226,232,240,0.35)] text-sm font-mono">MP4 · MOV · AVI — Max 200MB</p>
                  <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/avi" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} data-testid="input-video-file" />
                </div>
              ) : (
                <div className="relative">
                  <video src={videoUrl} controls className="w-full max-h-72 rounded-xl" data-testid="video-preview" />
                  <button onClick={reset} className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(5,8,16,0.85)", border: "1px solid rgba(168,85,247,0.35)" }} data-testid="button-remove-video">
                    <X className="w-4 h-4 text-[#a855f7]" />
                  </button>
                  <p className="text-[rgba(226,232,240,0.4)] text-xs mt-3 font-mono truncate">{file?.name} ({(file!.size / 1024 / 1024).toFixed(1)} MB)</p>
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
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
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
                className="neon-btn-purple flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="button-analyze-video"
              >
                <Video className="w-4 h-4" />
                {analyzing ? "Analyzing..." : "Analyze Video"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="neon-btn-blue px-6 py-4 rounded-2xl font-medium flex items-center gap-2"
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {analyzing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card-purple rounded-2xl mt-6">
                <VideoScanAnimation />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && badge && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-purple rounded-2xl mt-6 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${badge.color}50, transparent)` }} />
                  <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: badge.color }}>Deepfake Analysis Complete</span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${badge.color}50)` }} />
                </div>

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="rounded-2xl p-5 mb-6 flex items-center gap-4"
                  style={{ background: badge.bg, border: `1px solid ${badge.border}`, boxShadow: `0 0 30px ${badge.color}10` }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${badge.color}12`, border: `1px solid ${badge.border}` }}
                  >
                    <badge.icon className="w-7 h-7" style={{ color: badge.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-2xl font-orbitron tracking-wider" style={{ color: badge.color, textShadow: `0 0 20px ${badge.color}60` }}>
                      {badge.text}
                    </div>
                    <div className="text-[rgba(226,232,240,0.5)] text-sm mt-1 font-sora">
                      {result.framesAnalyzed} frames analyzed ·{" "}
                      {effectiveLabel === "uncertain"
                        ? `Inconclusive (confidence: ${result.confidenceScore}%)`
                        : effectiveLabel === "ai_generated"
                          ? `${result.aiGeneratedPercent}% deepfake probability`
                          : `${result.realPercent}% authentic probability`}
                    </div>
                  </div>
                </motion.div>

                <div className="flex justify-center gap-10 mb-7">
                  <RadialProgress percent={result.aiGeneratedPercent} color="#f59e0b" label="Deepfake" />
                  <RadialProgress percent={result.realPercent} color="#10b981" label="Authentic" />
                  <RadialProgress percent={result.confidenceScore} color="#a855f7" label="Confidence" />
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.1)" }}>
                  <p className="text-xs text-[rgba(168,85,247,0.55)] uppercase tracking-widest mb-2 font-mono">Frame Analysis Report</p>
                  <p className="text-[rgba(226,232,240,0.75)] text-sm leading-relaxed font-sora">{result.explanation}</p>
                </div>

                <div className="text-xs text-[rgba(226,232,240,0.25)] font-mono text-right">
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
