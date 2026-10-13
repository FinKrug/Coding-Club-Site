// A small in-memory cache for data that's the same for every visitor: the
// challenge list, challenge pages, the leaderboard, and first solvers.
//
// Why: every withDb() call opens a brand-new MongoDB connection (see
// lib/mongodb.js), and that connection setup is the most expensive thing a
// request does. It's what pushed pages past Cloudflare's CPU limit
// (Error 1102). With this cache, a warm Worker answers most page views
// without touching the database at all.
//
//   const list = await cached("challenges:list", 5 * 60_000, () => loadList());
//
// How it behaves on Cloudflare:
//   - Each Worker instance has its own copy. Instances come and go, so this
//     is a speed-up, never the source of truth.
//   - invalidate() only clears the instance it runs in. Other instances
//     catch up when their copy expires, so keep TTLs short for anything
//     that changes often (the leaderboard uses 60 seconds).
//   - Only finished values are stored, never pending promises: a Worker
//     can't safely share an in-flight database call between two requests.
//
// Server-only.

const MAX_ENTRIES = 500;
const store = new Map(); // key -> { value, expires }

export async function cached(key, ttlMs, load) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return structuredClone(hit.value);

  const value = await load();
  store.delete(key); // re-insert so the newest entries sit at the end
  store.set(key, { value, expires: Date.now() + ttlMs });
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value); // drop the oldest

  // Hand out copies so a caller editing its result can't change what
  // the next visitor sees.
  return structuredClone(value);
}

// Drops every entry whose key starts with `prefix`, e.g. "leaderboard:".
export function invalidate(prefix) {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
