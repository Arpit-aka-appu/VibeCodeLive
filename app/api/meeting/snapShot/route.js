// app/api/snapshot/route.js  (Next.js App Router)
// POST /api/snapshot
// Body: { studentId, studentName, assignmentId, ...telemetry fields, code, latestOutput }

import { NextResponse } from "next/server";
import { buildBehaviorContext, analyzeWithGemini } from "./util";
import { AIResultSchema, buildFallbackAiResult } from "./aiSchema";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      studentId,
      studentName,
      assignmentId,
      code,
      latestOutput,
    } = body;

    // Step 1: Free heuristic status (math only, no AI)
    const { status, label, contextLines } = buildBehaviorContext(body);

    // Step 2: Real AI call — validated, with safe fallback
    let aiResult;
    try {
      const rawAiResponse = await analyzeWithGemini(
        studentName, assignmentId, contextLines, code, latestOutput
      );
      aiResult = AIResultSchema.parse(rawAiResponse);
      console.log("✅ AI result validated successfully");
    } catch (err) {
      console.warn("⚠️ AI call/validation failed, using fallback:", err.message);
      aiResult = buildFallbackAiResult(label);
    }

    // Step 3: Build the final snapshot for the teacher dashboard
    const snapshot = {
      studentId,
      studentName: studentName ?? "Unknown",
      assignmentId,
      status,
      label,
      contextLines,
      score: aiResult.score,
      summary: aiResult.summary,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    console.error("[/api/snapshot]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}