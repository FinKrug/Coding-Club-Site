import { withDb } from "@/lib/mongodb";

// GET /api/health: checks the site can reach its database. Open it in a
// browser after deploying (https://neumontcoding.club/api/health) to see
// whether MongoDB is reachable, how long it took, and the exact error if not.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const settings = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    PASSWORD_PEPPER: Boolean(process.env.PASSWORD_PEPPER),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
  };
  try {
    await withDb((db) => db.command({ ping: 1 }));
    return Response.json(
      { database: "connected", milliseconds: Date.now() - started, settingsPresent: settings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Health check: database unreachable:", error);
    return Response.json(
      {
        database: "unreachable",
        milliseconds: Date.now() - started,
        error: `${error.name}: ${String(error.message).slice(0, 300)}`,
        settingsPresent: settings,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
