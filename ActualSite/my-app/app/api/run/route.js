import { executeOnJudge0, Judge0Error } from "@/lib/judge0";

// Plain "run my code" endpoint, used for challenges that don't have tests
// yet. Challenges with tests go through /api/challenges/[id]/run instead.

export async function GET() {
  return Response.json({
    message: "Neumont Coding Club compiler API is running!"
  });
}

export async function POST(request) {
  try {
    const { code, languageId, stdin = "" } = await request.json();

    if (!code) {
      return Response.json(
        { error: "No code provided." },
        { status: 400 }
      );
    }

    if (!languageId) {
      return Response.json(
        { error: "No language selected." },
        { status: 400 }
      );
    }

    const result = await executeOnJudge0({ source: code, languageId, stdin });
    return Response.json(result);

  } catch (error) {
    if (error instanceof Judge0Error) {
      return Response.json(
        { error: error.message, details: error.details },
        { status: error.status || 502 }
      );
    }

    console.error("Compiler error:", error);

    return Response.json(
      { error: "Failed to execute code.", details: error.message },
      { status: 500 }
    );
  }
}
