"use client";

// Runs a submission through our server-side /api/run route (talking to the
// hosted Judge0 box).
//
// This used to also support running against a Judge0 instance in Docker on
// the visitor's own machine, straight from the browser. That option was
// removed: Judge0's sandboxing needs the legacy cgroup v1 hierarchy, and
// WSL2 dropped support for it entirely as of WSL version 2.5.1, so it
// simply can't run under Docker on Windows anymore — see
// local-dev-tools/README.md for the full story. "Run Code" always goes
// through our hosted Judge0 now.

export async function runCode({ code, languageId, stdin = "" }) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, languageId, stdin }),
  });
  const result = await response.json();
  return { result, response };
}
