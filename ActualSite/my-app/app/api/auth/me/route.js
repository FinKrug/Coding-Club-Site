import { ObjectId } from "mongodb";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { withDb } from "@/lib/mongodb";

// GET /api/auth/me — who's signed in, with their current point balance.
// Used by the navbar. Returns { user: null } for signed-out visitors.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  const session = await getSession();
  if (!session) return Response.json({ user: null }, { headers });

  try {
    const user = await withDb((db) =>
      db.collection("users").findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { name: 1, email: 1, image: 1, points: 1, role: 1 } }
      )
    );

    if (!user) {
      // Account was deleted from the database: drop the stale cookie.
      const response = Response.json({ user: null }, { headers });
      response.headers.append(
        "Set-Cookie",
        `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
      );
      return response;
    }

    return Response.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          points: user.points ?? 0,
          role: user.role ?? "member",
        },
      },
      { headers }
    );
  } catch (error) {
    // Database unreachable: still show who's signed in, just without points.
    console.error("Failed to load user:", error);
    return Response.json(
      {
        user: {
          id: session.userId,
          name: session.name,
          email: session.email,
          image: session.image,
          points: null,
          role: "member",
        },
      },
      { headers }
    );
  }
}
