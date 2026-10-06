import { getSession } from "@/lib/session";
import { handleGradeRequest } from "@/lib/gradeRequest";

// POST /api/challenges/[id]/submit: runs every test, hidden ones included.
// Requires sign-in: a fully passing submission earns points.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in to submit your solution.", signIn: true }, { status: 401 });
  }
  return handleGradeRequest(request, params, "submit", session);
}
