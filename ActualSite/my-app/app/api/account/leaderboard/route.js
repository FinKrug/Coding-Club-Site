import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/session";
import { withDb } from "@/lib/mongodb";
import { siteOrigin } from "@/lib/oauth";
import { rejectCrossSite } from "@/lib/authHelpers";

// POST /api/account/leaderboard (a form on the Account page)
//   visible=0  hide me from the leaderboard and challenge "first solvers"
//   visible=1  show me again
// Points are still earned either way.
export async function POST(request) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const back = new URL("/account#leaderboard", siteOrigin(request));
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login?returnTo=/account", siteOrigin(request)), 303);

  const form = await request.formData().catch(() => null);
  const visible = form?.get("visible") === "1";
  try {
    await withDb((db) =>
      db
        .collection("users")
        .updateOne({ _id: new ObjectId(session.userId) }, { $set: { hideFromLeaderboard: !visible } })
    );
  } catch (error) {
    console.error("Failed to update leaderboard setting:", error);
    return NextResponse.redirect(new URL("/account?leaderboardError=1#leaderboard", siteOrigin(request)), 303);
  }
  return NextResponse.redirect(back, 303);
}
