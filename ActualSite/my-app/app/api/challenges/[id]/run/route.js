import { handleGradeRequest } from "@/lib/gradeRequest";

// POST /api/challenges/[id]/run: runs the member's code against the
// challenge's visible tests only. No sign-in needed.
export async function POST(request, { params }) {
  return handleGradeRequest(request, params, "run");
}
