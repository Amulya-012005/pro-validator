import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Upload, X, Video, RotateCcw, ArrowLeft, CheckCircle, AlertTriangle, Film } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAnalyticsQueryKey, getGetHistoryQueryKey } from "@workspace/api-client-react";

interface DetectionResult {
  id: number;
  fileName: string;
  fileType: string;
  prediction: "ai_generated" | "real";
  aiGeneratedPercent: number;
  realPercent: number;
  confidenceScore: number;
  explanation: string;
  framesAnalyzed: number | null;
  timestamp: string;
}

function VideoScanAnimation() {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative w-36 h-24 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)" }}>
        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, #a855f7, transparent)", boxShadow: "0 0 8px rgba(168,85,247,0.8)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-8 h-8 text-[rgba(168,85,247,0.4)]" />
        </div>
        {/* Corner brackets */}
        {[["top-1 left-1", "border-t border-l"], ["top-1 right-1", "border-t border-r"], ["bottom-1 left-1", "border-b border-l"], ["bottom-1 right-1", "border-b border-r"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute w-3 h-3 ${pos} ${borders}`} style={{ borderColor: "#a855f7" }} />
        ))}
      </div>
      <div className="text-center">
        <motion.p className="text-[#a855f7] font-mono text-sm tracking-widest" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
          EXTRACTING FRAMES...
        </motion.p>
        <p className="text-[rgba(226,232,240,0.4)] text-xs mt-2">Deepfake neural analysis in progress</p>
      </div>
      <div className="w-64 h-1.5 rounded-full overflow-hidden bg-[rgba(168,85,247,0.1)]">
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, #a855f7, transparent)" }} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["FRAME EXTRACT", "FACE DETECT", "ARTIFACT SCAN", "CONFIDENCE"].map((step, i) => (
          <motion.div key={step} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }} className="text-[9px] text-[rgba(168,85,247,0.7)] uppercase tracking-wider text-center">
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RadialProgress({ percent, color, label }: { percent: number; color: string; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(226,232,240,0.08)" strokeWidth="8" />
          <motion.circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color }}>{percent.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-xs text-[rgba(226,232,240,0.5)] uppercase tracking-wider">{label}</span>
    </div>
  );
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

  const isAI = result?.prediction === "ai_generated";

  return (
    <div className="min-h-screen" style={{ background: "#060a14" }}>
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/">
              <button className="flex items-center gap-2 text-[rgba(226,232,240,0.4)] hover:text-[#a855f7] text-sm mb-6 transition-colors" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <Video className="w-4 h-4 text-[#a855f7]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Video Detector</h1>
            </div>
            <p className="text-[rgba(226,232,240,0.4)] text-sm">Upload a video to detect deepfake patterns with frame-by-frame analysis</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="glass-card rounded-xl p-6 mb-4 transition-all" onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} style={{ borderColor: dragging ? "rgba(168,85,247,0.5)" : undefined }}>
              {!videoUrl ? (
                <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-16 cursor-pointer transition-all" style={{ borderColor: "rgba(168,85,247,0.2)" }} onClick={() => inputRef.current?.click()} data-testid="dropzone-video">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)" }}>
                    <Upload className="w-7 h-7 text-[#a855f7]" />
                  </div>
                  <p className="text-white font-medium mb-1">Drop video here or click to browse</p>
                  <p className="text-[rgba(226,232,240,0.4)] text-sm">MP4, MOV, AVI — Max 200MB</p>
                  <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/avi" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} data-testid="input-video-file" />
                </div>
              ) : (
                <div className="relative">
                  <video src={videoUrl} controls className="w-full max-h-72 rounded-lg" data-testid="video-preview" />
                  <button onClick={reset} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(6,10,20,0.8)", border: "1px solid rgba(168,85,247,0.3)" }} data-testid="button-remove-video">
                    <X className="w-4 h-4 text-[#a855f7]" />
                  </button>
                  <p className="text-[rgba(226,232,240,0.5)] text-xs mt-3 font-mono truncate">{file?.name} ({(file!.size / 1024 / 1024).toFixed(1)} MB)</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!file || analyzing} onClick={analyze} className="neon-btn-purple flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" data-testid="button-analyze-video">
                <Video className="w-4 h-4" />
                {analyzing ? "Analyzing..." : "Analyze Video"}
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={reset} className="neon-btn-blue px-5 py-3 rounded-xl font-medium flex items-center gap-2" data-testid="button-reset">
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {analyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card rounded-xl mt-6">
                <VideoScanAnimation />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl mt-6 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 h-px" style={{ background: isAI ? "linear-gradient(90deg, rgba(251,191,36,0.5), transparent)" : "linear-gradient(90deg, rgba(16,185,129,0.5), transparent)" }} />
                  <span className="text-xs uppercase tracking-widest font-mono" style={{ color: isAI ? "#f59e0b" : "#10b981" }}>Deepfake Analysis Complete</span>
                  <div className="flex-1 h-px" style={{ background: isAI ? "linear-gradient(90deg, transparent, rgba(251,191,36,0.5))" : "linear-gradient(90deg, transparent, rgba(16,185,129,0.5))" }} />
                </div>

                <div className="rounded-xl p-4 mb-6 flex items-center gap-4" style={{ background: isAI ? "rgba(251,191,36,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isAI ? "rgba(251,191,36,0.3)" : "rgba(16,185,129,0.3)"}` }}>
                  {isAI ? <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" /> : <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                  <div>
                    <div className="font-bold text-lg" style={{ color: isAI ? "#f59e0b" : "#10b981" }}>
                      {isAI ? "Deepfake Detected" : "Authentic Video"}
                    </div>
                    <div className="text-[rgba(226,232,240,0.5)] text-sm">
                      {result.framesAnalyzed} frames analyzed &nbsp;·&nbsp; {isAI ? `${result.aiGeneratedPercent}% deepfake probability` : `${result.realPercent}% authentic probability`}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-12 mb-6">
                  <RadialProgress percent={result.aiGeneratedPercent} color="#f59e0b" label="Deepfake" />
                  <RadialProgress percent={result.realPercent} color="#10b981" label="Authentic" />
                  <RadialProgress percent={result.confidenceScore} color="#a855f7" label="Confidence" />
                </div>

                <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}>
                  <p className="text-xs text-[rgba(168,85,247,0.6)] uppercase tracking-widest mb-2 font-mono">Frame Analysis Report</p>
                  <p className="text-[rgba(226,232,240,0.8)] text-sm leading-relaxed">{result.explanation}</p>
                </div>

                <div className="text-xs text-[rgba(226,232,240,0.3)] font-mono text-right">
                  Analyzed: {new Date(result.timestamp).toLocaleString()} &nbsp;·&nbsp; {result.fileName}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
