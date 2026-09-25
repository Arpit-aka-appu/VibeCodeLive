// app/api/snapshot/aiSchema.js
import { z } from "zod";

export const AIResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.object({
    whatStudentDid: z.string(),
    struggling: z.string().nullable(),
    doingWell: z.string().nullable(),
    suspiciousBehavior: z.string().nullable(),
    adviceForTeacher: z.string(),
  }),
});

export function buildFallbackAiResult(label) {
  return {
    score: 50,
    summary: {
      whatStudentDid: "Activity recorded, but AI analysis is unavailable for this snapshot.",
      struggling: null,
      doingWell: null,
      suspiciousBehavior: null,
      adviceForTeacher: `AI insight unavailable — heuristic label was "${label ?? "unknown"}", consider reviewing manually.`,
    },
  };
}