import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Upload, X, Scan, RotateCcw, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
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

function ScanningAnimation() {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative w-28 h-28">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-[#00d4ff]"
            animate={{ scale: [1, 2], opacity: [0.8, 0] }}
            transition={{ duration: 2, delay: i * 0.7, repeat: Infinity }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.5)",
            boxShadow: "0 0 30px rgba(0,212,255,0.3)",
          }}
        >
          <Scan className="w-10 h-10 text-[#00d4ff]" />
        </div>
      </div>
      <div className="text-center">
        <motion.p
          className="text-[#00d4ff] font-mono text-sm tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ANALYZING NEURAL PATTERNS...
        </motion.p>
        <p className="text-[rgba(226,232,240,0.4)] text-xs mt-2">
          Running deep feature extraction
        </p>
      </div>
      {/* Data flow bar */}
      <div className="w-64 h-1.5 rounded-full overflow-hidden bg-[rgba(0,212,255,0.1)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-[10px] text-[rgba(226,232,240,0.4)]">
        {["PREPROCESSING", "FEATURE EXTRACTION", "CLASSIFICATION"].map((step, i) => (
          <motion.div
            key={step}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }}
            className="uppercase tracking-wider"
          >
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
          <motion.circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color }}>
            {percent.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-[rgba(226,232,240,0.5)] uppercase tracking-wider">{label}</span>
    </div>
  );
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

  const isAI = result?.prediction === "ai_generated";

  return (
    <div className="min-h-screen" style={{ background: "#060a14" }}>
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/">
              <button className="flex items-center gap-2 text-[rgba(226,232,240,0.4)] hover:text-[#00d4ff] text-sm mb-6 transition-colors" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}>
                <Scan className="w-4 h-4 text-[#00d4ff]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Image Detector</h1>
            </div>
            <p className="text-[rgba(226,232,240,0.4)] text-sm">Upload an image to analyze for AI generation patterns</p>
          </motion.div>

          {/* Upload area */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div
              className="glass-card rounded-xl p-6 mb-4 transition-all"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{ borderColor: dragging ? "rgba(0,212,255,0.5)" : undefined, boxShadow: dragging ? "0 0 30px rgba(0,212,255,0.1)" : undefined }}
            >
              {!preview ? (
                <div
                  className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-16 cursor-pointer transition-all"
                  style={{ borderColor: "rgba(0,212,255,0.2)" }}
                  onClick={() => inputRef.current?.click()}
                  data-testid="dropzone-image"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-glow-pulse" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.3)" }}>
                    <Upload className="w-7 h-7 text-[#00d4ff]" />
                  </div>
                  <p className="text-white font-medium mb-1">Drop image here or click to browse</p>
                  <p className="text-[rgba(226,232,240,0.4)] text-sm">PNG, JPG, JPEG, WEBP — Max 20MB</p>
                  <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} data-testid="input-image-file" />
                </div>
              ) : (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-80 object-contain rounded-lg" data-testid="img-preview" />
                  <button onClick={reset} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "rgba(6,10,20,0.8)", border: "1px solid rgba(0,212,255,0.3)" }} data-testid="button-remove-image">
                    <X className="w-4 h-4 text-[#00d4ff]" />
                  </button>
                  <p className="text-[rgba(226,232,240,0.5)] text-xs mt-3 font-mono truncate">{file?.name}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                disabled={!file || analyzing}
                onClick={analyze}
                className="neon-btn-blue flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="button-analyze-image"
              >
                <Scan className="w-4 h-4" />
                {analyzing ? "Analyzing..." : "Analyze Image"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="neon-btn-purple px-5 py-3 rounded-xl font-medium flex items-center gap-2"
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
            </div>
          </motion.div>

          {/* Scanning animation */}
          <AnimatePresence>
            {analyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card rounded-xl mt-6">
                <ScanningAnimation />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl mt-6 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 h-px" style={{ background: isAI ? "linear-gradient(90deg, rgba(251,191,36,0.5), transparent)" : "linear-gradient(90deg, rgba(16,185,129,0.5), transparent)" }} />
                  <span className="text-xs uppercase tracking-widest font-mono" style={{ color: isAI ? "#f59e0b" : "#10b981" }}>Analysis Complete</span>
                  <div className="flex-1 h-px" style={{ background: isAI ? "linear-gradient(90deg, transparent, rgba(251,191,36,0.5))" : "linear-gradient(90deg, transparent, rgba(16,185,129,0.5))" }} />
                </div>

                {/* Prediction banner */}
                <div className="rounded-xl p-4 mb-6 flex items-center gap-4" style={{ background: isAI ? "rgba(251,191,36,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${isAI ? "rgba(251,191,36,0.3)" : "rgba(16,185,129,0.3)"}` }}>
                  {isAI ? <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" /> : <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                  <div>
                    <div className="font-bold text-lg" style={{ color: isAI ? "#f59e0b" : "#10b981" }}>
                      {isAI ? "AI Generated" : "Real Image"}
                    </div>
                    <div className="text-[rgba(226,232,240,0.5)] text-sm">
                      {isAI ? `${result.aiGeneratedPercent}% probability this image is AI-generated` : `${result.realPercent}% probability this is a real image`}
                    </div>
                  </div>
                </div>

                {/* Progress charts */}
                <div className="flex justify-center gap-12 mb-6">
                  <RadialProgress percent={result.aiGeneratedPercent} color="#f59e0b" label="AI Generated" />
                  <RadialProgress percent={result.realPercent} color="#10b981" label="Real" />
                  <RadialProgress percent={result.confidenceScore} color="#00d4ff" label="Confidence" />
                </div>

                {/* Explanation */}
                <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                  <p className="text-xs text-[rgba(0,212,255,0.6)] uppercase tracking-widest mb-2 font-mono">Detection Analysis</p>
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
