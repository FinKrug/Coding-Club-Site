import { getSession } from "@/lib/session";
import { handleGradeRequest } from "@/lib/gradeRequest";
import fairInfo from "@/data/fairInfo";

// POST /api/challenges/[id]/run: runs the member's code against the
// challenge's visible tests only. Needs sign-in, since running code costs
// server time. The one exception is the club fair challenge
// (data/fairInfo.js): guests at the booth can try it without an account.
export async function POST(request, { params }) {
  const { id } = await params;
  if (Number(id) !== fairInfo.challengeId && !(await getSession())) {
    return Response.json({ error: "Sign in to run your code.", signIn: true }, { status: 401 });
  }
  return handleGradeRequest(request, params, "run");
}
