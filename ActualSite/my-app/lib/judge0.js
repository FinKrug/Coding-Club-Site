// Sends one program to the hosted Judge0 server and waits for the result.
// Server-only: uses JUDGE0_URL / JUDGE0_AUTH_TOKEN.
import { submitToJudge0, Judge0Error } from "@/lib/judge/judge0Api.mjs";

export { Judge0Error };

export async function executeOnJudge0(job) {
  try {
    return await submitToJudge0({
      url: process.env.JUDGE0_URL,
      token: process.env.JUDGE0_AUTH_TOKEN,
      ...job,
    });
  } catch (error) {
    if (error instanceof Judge0Error && error.details) console.error("Judge0 error:", error.details);
    throw error;
  }
}
