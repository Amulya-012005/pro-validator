import { Router, type IRouter } from "express";
import { db, detectionsTable } from "@workspace/db";
import { desc, eq, ilike, and, type SQL } from "drizzle-orm";
import { GetHistoryQueryParams, DeleteHistoryEntryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/history", async (req, res): Promise<void> => {
  const parsed = GetHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, type, result, search } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (type) {
    conditions.push(eq(detectionsTable.fileType, type));
  }
  if (result) {
    conditions.push(eq(detectionsTable.prediction, result));
  }
  if (search) {
    conditions.push(ilike(detectionsTable.fileName, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allRows, entries] = await Promise.all([
    db.select({ id: detectionsTable.id }).from(detectionsTable).where(whereClause),
    db
      .select()
      .from(detectionsTable)
      .where(whereClause)
      .orderBy(desc(detectionsTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json({
    entries: entries.map((e) => ({
      id: e.id,
      fileName: e.fileName,
      fileType: e.fileType,
      prediction: e.prediction,
      aiGeneratedPercent: e.aiGeneratedPercent,
      realPercent: e.realPercent,
      confidenceScore: e.confidenceScore,
      explanation: e.explanation,
      framesAnalyzed: e.framesAnalyzed,
      timestamp: e.createdAt.toISOString(),
    })),
    total: allRows.length,
    page,
    limit,
  });
});

router.delete("/history/:id", async (req, res): Promise<void> => {
  const params = DeleteHistoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(detectionsTable)
    .where(eq(detectionsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
