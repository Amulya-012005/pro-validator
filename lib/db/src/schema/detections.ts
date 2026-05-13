import { pgTable, text, serial, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const detectionsTable = pgTable("detections", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'image' | 'video'
  prediction: text("prediction").notNull(), // 'ai_generated' | 'real'
  aiGeneratedPercent: real("ai_generated_percent").notNull(),
  realPercent: real("real_percent").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  explanation: text("explanation").notNull(),
  framesAnalyzed: integer("frames_analyzed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDetectionSchema = createInsertSchema(detectionsTable).omit({ id: true, createdAt: true });
export type InsertDetection = z.infer<typeof insertDetectionSchema>;
export type Detection = typeof detectionsTable.$inferSelect;
