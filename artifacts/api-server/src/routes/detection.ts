import { Router, type IRouter } from "express";
import multer from "multer";
import { db, detectionsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getInferenceWorker } from "../lib/pythonInference";

const router: IRouter = Router();

const storage = multer.memoryStorage();

const imageUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: PNG, JPG, JPEG, WEBP"));
    }
  },
});

// ── Image analysis via PyTorch ensemble model ────────────────────────────────
async function analyzeImage(buffer: Buffer, fileName: string): Promise<{
  prediction: "ai_generated" | "real";
  label: string;
  aiGeneratedPercent: number;
  realPercent: number;
  confidenceScore: number;
  explanation: string;
}> {
  const worker = getInferenceWorker();
  logger.info({ fileName, bytes: buffer.length }, "Sending image to Python inference worker");
  const result = await worker.predict(buffer);
  logger.info(
    { fileName, prediction: result.prediction, label: result.label, aiPct: result.aiGeneratedPercent, confidence: result.confidenceScore },
    "Inference result received"
  );
  return {
    prediction: result.prediction,
    label: result.label,
    aiGeneratedPercent: result.aiGeneratedPercent,
    realPercent: result.realPercent,
    confidenceScore: result.confidenceScore,
    explanation: result.explanation,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.post(
  "/detect-image",
  imageUpload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    req.log.info({ fileName: req.file.originalname, size: req.file.size }, "Image detection request received");

    try {
      const analysis = await analyzeImage(req.file.buffer, req.file.originalname);

      const [detection] = await db
        .insert(detectionsTable)
        .values({
          fileName: req.file.originalname,
          fileType: "image",
          prediction: analysis.prediction,
          aiGeneratedPercent: analysis.aiGeneratedPercent,
          realPercent: analysis.realPercent,
          confidenceScore: analysis.confidenceScore,
          explanation: analysis.explanation,
          framesAnalyzed: null,
        })
        .returning();

      res.json({
        id: detection.id,
        fileName: detection.fileName,
        fileType: detection.fileType,
        prediction: detection.prediction,
        label: analysis.label,
        aiGeneratedPercent: detection.aiGeneratedPercent,
        realPercent: detection.realPercent,
        confidenceScore: detection.confidenceScore,
        explanation: detection.explanation,
        framesAnalyzed: detection.framesAnalyzed,
        timestamp: detection.createdAt.toISOString(),
      });
    } catch (err) {
      req.log.error({ err }, "Error analyzing image");
      res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  }
);

// Multer error handler
router.use((err: Error, _req: any, res: any, _next: any) => {
  if (err.message) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
