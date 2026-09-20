import { getLanguageConfig, isValidLanguage } from "@/lib/languageConfig";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { code, language, language_id, input } = body;

    // 1. Validation: Check language validity against allowlist
    const requestedLang = language ?? language_id;
    if (!requestedLang || !isValidLanguage(requestedLang)) {
      return NextResponse.json(
        { error: "Unsupported programming language." },
        { status: 400 }
      );
    }

    const langConfig = getLanguageConfig(requestedLang);
    const resolvedLanguageId = langConfig.judge0Id;

    // 2. Forward execution request to Judge0 CE
    const response = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": process.env.RAPID_HOST || "judge0-ce.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPID_KEY || "",
        },
        body: JSON.stringify({
          source_code: code || "",
          language_id: resolvedLanguageId,
          stdin: input || "",
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status || 200 });
  } catch (error) {
    console.error("POST /api/run error:", error);
    return NextResponse.json(
      { error: error?.message || "Execution engine temporarily unavailable." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "TeachView Code Execution API" });
}