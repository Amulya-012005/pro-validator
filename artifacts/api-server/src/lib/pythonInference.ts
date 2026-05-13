import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import { createInterface } from "readline";
import { logger } from "./logger";

interface PendingRequest {
  resolve: (result: InferenceResult) => void;
  reject: (err: Error) => void;
}

export interface InferenceResult {
  prediction: "ai_generated" | "real";
  label: string;
  aiGeneratedPercent: number;
  realPercent: number;
  confidenceScore: number;
  explanation: string;
}

class PythonInferenceWorker {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (err: Error) => void;
  private restartCount = 0;
  private readonly maxRestarts = 3;

  constructor() {
    this.readyPromise = new Promise((res, rej) => {
      this.readyResolve = res;
      this.readyReject  = rej;
    });
    // Prevent unhandled rejection crash if worker fails to start
    this.readyPromise.catch(() => {});
    this.start();
  }

  private get scriptPath(): string {
    // At runtime the bundle lives in dist/, so __dirname = artifacts/api-server/dist
    // inference.py sits one level up at artifacts/api-server/inference.py
    return path.resolve(__dirname, "..", "inference.py");
  }

  private start(): void {
    logger.info({ script: this.scriptPath }, "Spawning Python inference worker");

    this.proc = spawn("python3", [this.scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // ── stdout: newline-delimited JSON messages ──────────────────────────────
    const rl = createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        logger.warn({ line }, "Non-JSON stdout from inference worker");
        return;
      }

      if (msg.type === "ready") {
        this.ready = true;
        logger.info("Python inference worker is ready");
        this.readyResolve();
        return;
      }

      const cb = this.pending.get(msg.id);
      if (!cb) {
        logger.warn({ id: msg.id }, "No pending request for inference response");
        return;
      }
      this.pending.delete(msg.id);

      if (msg.type === "error") {
        cb.reject(new Error(msg.error ?? "Inference error"));
      } else if (msg.type === "result") {
        cb.resolve(msg as InferenceResult);
      }
    });

    // ── stderr: log everything from Python ───────────────────────────────────
    this.proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) logger.info({ source: "inference.py" }, text);
    });

    // ── exit handler ─────────────────────────────────────────────────────────
    this.proc.on("exit", (code, signal) => {
      logger.warn({ code, signal }, "Python inference worker exited");
      this.ready = false;

      // Reject all pending requests
      for (const [, cb] of this.pending) {
        cb.reject(new Error("Inference worker exited unexpectedly"));
      }
      this.pending.clear();

      if (this.restartCount < this.maxRestarts) {
        this.restartCount++;
        logger.info({ attempt: this.restartCount }, "Restarting inference worker");
        // Fresh ready promise
        this.readyPromise = new Promise((res, rej) => {
          this.readyResolve = res;
          this.readyReject  = rej;
        });
        // Suppress unhandled rejection on the new promise
        this.readyPromise.catch(() => {});
        setTimeout(() => this.start(), 2000);
      } else {
        logger.error("Inference worker exceeded max restarts — giving up");
        this.readyReject(new Error("Inference worker failed to start"));
      }
    });

    this.proc.on("error", (err) => {
      logger.error({ err }, "Failed to spawn Python inference worker");
      this.readyReject(err);
    });
  }

  async predict(imageBuffer: Buffer): Promise<InferenceResult> {
    await this.readyPromise;

    const id = this.nextId++;
    const b64 = imageBuffer.toString("base64");

    return new Promise<InferenceResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const msg = JSON.stringify({ type: "predict", id, data: b64 }) + "\n";
      this.proc!.stdin.write(msg, (err) => {
        if (err) {
          this.pending.delete(id);
          reject(new Error(`Failed to write to inference worker: ${err.message}`));
        }
      });

      // 60-second timeout per request
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("Inference timeout after 60s"));
        }
      }, 60_000);
    });
  }

  isReady(): boolean {
    return this.ready;
  }
}

// Singleton — constructed once when the module is first imported
let _worker: PythonInferenceWorker | null = null;

export function getInferenceWorker(): PythonInferenceWorker {
  if (!_worker) {
    _worker = new PythonInferenceWorker();
  }
  return _worker;
}

// Boot eagerly at module load so the model is warm before the first request
getInferenceWorker();
