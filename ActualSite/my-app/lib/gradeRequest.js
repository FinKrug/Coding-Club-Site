import { getChallengeForGrading } from "@/lib/challenges";
import { grade, GradingError } from "@/lib/judge/grade.mjs";
import { executeOnJudge0, Judge0Error } from "@/lib/judge0";
import { awardSolve } from "@/lib/points";

// Shared by POST /api/challenges/[id]/run and /submit.
// Body: { code: string, languageId: number }

const MAX_CODE_LENGTH = 64 * 1024;

function error(message, status, extra = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

// `session` is required for mode "submit" (points go to that user).
export async function handleGradeRequest(request, params, mode, session = null) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error("Send JSON with `code` and `languageId`.", 400);
  }

  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) return error("Write some code first.", 400);
  if (code.length > MAX_CODE_LENGTH) return error("Your code is too long (64 KB max).", 413);

  const { id } = await params;
  let challenge;
  try {
    challenge = await getChallengeForGrading(id);
  } catch (err) {
    console.error("Failed to load challenge for grading:", err);
    return error("Couldn't load this challenge right now. Please try again.", 503);
  }
  if (!challenge) return error("Challenge not found.", 404);
  if (!challenge.function) return error("This challenge doesn't have tests yet.", 400);

  try {
    const result = await grade({
      fn: challenge.function,
      tests: challenge.tests,
      languageId: Number(body.languageId),
      code,
      mode,
      timeLimitSeconds: challenge.timeLimitSeconds,
      execute: (job) => executeOnJudge0({ ...job, memoryLimitKb: 256000 }),
    });
    // A fully passing Submit earns points (once per challenge per language).
    let points = null;
    if (mode === "submit" && session && result.status === "passed") {
      try {
        points = await awardSolve({ userId: session.userId, challenge, languageId: Number(body.languageId) });
      } catch (err) {
        console.error("Failed to award points:", err);
        points = { error: "Your solution passed, but we couldn't save your points. Please submit again." };
      }
    }
    return Response.json({ result, points });
  } catch (err) {
    if (err instanceof GradingError) return error(err.message, 400);
    if (err instanceof Judge0Error) {
      return error("The code runner isn't responding right now. Please try again in a minute.", 502);
    }
    console.error("Grading failed:", err);
    return error("Something went wrong while running your code.", 500);
  }
}
