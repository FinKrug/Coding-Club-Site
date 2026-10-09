import { MongoClient } from "mongodb";

// Opens a MongoDB connection, hands the database to `fn`, then closes it.
//
//   const user = await withDb((db) => db.collection("users").findOne({ ... }));
//
// Why not one shared, long-lived MongoClient like a normal Node server?
// The site runs on Cloudflare Workers, and Workers don't let a network
// connection opened while handling one request be reused by a later one
// (you get "Cannot perform I/O on behalf of a different request"). So each
// call gets its own small client and closes it when it's done. That costs a
// few hundred ms of connection setup per request, which is fine for a club
// site; batch related queries into a single withDb() call to only pay it once.
//
// Server-only: never import this from a "use client" component.
export async function withDb(fn) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. See the 'Accounts & Database' section of the README."
    );
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    // A Worker can only have 6 connections open at once. In its default
    // "stream" mode the driver opens two background connections per cluster
    // server (3 servers on Atlas = 6) plus one for the query = 7, so the
    // query can stall. "poll" uses one background connection per server.
    serverMonitoringMode: "poll",
    appName: "coding-club-site",
  });

  try {
    await client.connect();
    return await fn(client.db(process.env.MONGODB_DB || "coding-club"));
  } finally {
    await client.close().catch(() => {});
  }
}
