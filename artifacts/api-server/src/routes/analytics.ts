import { Router, type IRouter } from "express";
import { db, detectionsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics", async (_req, res): Promise<void> => {
  const all = await db.select().from(detectionsTable).orderBy(desc(detectionsTable.createdAt));

  const totalImages = all.filter((r) => r.fileType === "image").length;
  const totalVideos = all.filter((r) => r.fileType === "video").length;
  const totalAiGenerated = all.filter((r) => r.prediction === "ai_generated").length;
  const totalReal = all.filter((r) => r.prediction === "real").length;

  const imageAiGenerated = all.filter(
    (r) => r.fileType === "image" && r.prediction === "ai_generated"
  ).length;
  const imageReal = all.filter(
    (r) => r.fileType === "image" && r.prediction === "real"
  ).length;
  const videoAiGenerated = all.filter(
    (r) => r.fileType === "video" && r.prediction === "ai_generated"
  ).length;
  const videoReal = all.filter(
    (r) => r.fileType === "video" && r.prediction === "real"
  ).length;

  // Build last 7 days activity
  const now = new Date();
  const recentActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = all.filter((r) => {
      const d = r.createdAt.toISOString().split("T")[0];
      return d === dateStr;
    }).length;
    recentActivity.push({ date: dateStr, count });
  }

  // Confidence distribution
  const buckets = [
    { range: "50-60%", min: 50, max: 60 },
    { range: "60-70%", min: 60, max: 70 },
    { range: "70-80%", min: 70, max: 80 },
    { range: "80-90%", min: 80, max: 90 },
    { range: "90-100%", min: 90, max: 101 },
  ];

  const confidenceDistribution = buckets.map((b) => ({
    range: b.range,
    count: all.filter(
      (r) => r.confidenceScore >= b.min && r.confidenceScore < b.max
    ).length,
  }));

  res.json({
    totalImages,
    totalVideos,
    totalAiGenerated,
    totalReal,
    imageAiGenerated,
    imageReal,
    videoAiGenerated,
    videoReal,
    recentActivity,
    confidenceDistribution,
  });
});

export default router;
