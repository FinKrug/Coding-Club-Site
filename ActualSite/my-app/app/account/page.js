import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/session";
import { withDb } from "@/lib/mongodb";
import { LANGUAGE_LIST } from "@/lib/judge/languageList.mjs";

export const metadata = {
  title: "Your Account — Neumont Coding Club",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account");

  let user = null;
  let solves = [];
  let dbError = false;
  try {
    // One connection for both queries.
    [user, solves] = await withDb((db) =>
      Promise.all([
        db.collection("users").findOne({ _id: new ObjectId(session.userId) }),
        db
          .collection("solves")
          .find({ userId: new ObjectId(session.userId) }, { projection: { _id: 0, challengeId: 1, languageId: 1 } })
          .toArray(),
      ])
    );
  } catch (error) {
    console.error("Failed to load account:", error);
    dbError = true;
  }

  const name = user?.name ?? session.name;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const challengesSolved = new Set(solves.map((solve) => solve.challengeId)).size;
  const perLanguage = LANGUAGE_LIST.map((language) => ({
    ...language,
    count: solves.filter((solve) => solve.languageId === language.id).length,
  })).filter((language) => language.count > 0);

  return (
    <div className="container">
      <section className="hero account-hero">
        <span className="eyebrow">Your Account</span>
        <h1>
          Hey, <span className="accent">{name.split(" ")[0]}</span>
        </h1>
        <p>{user?.email ?? session.email}</p>
      </section>

      <div className="account-grid">
        <div className="account-card">
          <span className="account-card-label">Points</span>
          <span className="account-points">
            {dbError ? "—" : (user?.points ?? 0).toLocaleString()}
          </span>
          <p className="account-card-note">
            {dbError
              ? "Couldn't reach the database right now. Try again in a bit."
              : "Earn points by solving challenges, in as many languages as you can."}
          </p>
        </div>

        <div className="account-card">
          <span className="account-card-label">Member since</span>
          <span className="account-card-value">{memberSince ?? "—"}</span>
          <p className="account-card-note">
            The points shop (fonts, color schemes, stickers) is coming soon.
          </p>
        </div>
      </div>

      {!dbError && (
        <div className="account-card account-solves">
          <span className="account-card-label">Challenges solved</span>
          <span className="account-card-value">
            {challengesSolved} {challengesSolved === 1 ? "challenge" : "challenges"} · {solves.length}{" "}
            {solves.length === 1 ? "solution" : "solutions"}
          </span>
          {perLanguage.length > 0 ? (
            <div className="account-languages">
              {perLanguage.map((language) => (
                <span key={language.id} className={`account-language${language.tier === "new" ? " priority" : ""}`}>
                  {language.name}: {language.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="account-card-note">
              Solve a challenge and press Submit to earn your first points.
            </p>
          )}
        </div>
      )}

      <form action="/api/auth/logout" method="post" className="account-actions">
        <button type="submit" className="btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}
