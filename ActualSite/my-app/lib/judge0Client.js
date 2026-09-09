"use client";

// Runs a submission either through our server-side /api/run route (talking
// to the hosted Judge0 box) or, when the visitor has opted in via Run
// Settings, straight from their browser to a Judge0 instance running in
// Docker on their own machine. The local path can't go through our
// Cloudflare Worker at all — the Worker has no way to reach "localhost" on
// someone else's laptop — so the browser has to call it directly.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str || "");
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(b64) {
  if (!b64) return b64;
  try {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return b64;
  }
}

function decodeResult(result) {
  return {
    ...result,
    stdout: fromBase64(result.stdout),
    stderr: fromBase64(result.stderr),
    compile_output: fromBase64(result.compile_output),
    message: fromBase64(result.message),
  };
}

async function runHosted({ code, languageId, stdin }) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, languageId, stdin }),
  });
  const result = await response.json();
  return { result, response };
}

async function runLocal({ code, languageId, stdin, baseUrl, token }) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  let response;

  try {
    response = await fetch(
      `${cleanBase}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Auth-Token": token } : {}),
        },
        body: JSON.stringify({
          source_code: toBase64(code),
          language_id: languageId,
          stdin: toBase64(stdin || ""),
          cpu_time_limit: 2,
          memory_limit: 128000,
        }),
      }
    );
  } catch (err) {
    return {
      result: {
        error: "Could not reach your local Judge0.",
        details:
          `Make sure Docker is running and ${cleanBase} is reachable. ` +
          `If it's up, this is usually a CORS issue — the bundled ` +
          `local-dev-tools/docker-compose.yml already enables it. (${err.message})`,
      },
      response: null,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      result: { error: "Local Judge0 returned an error.", details: text },
      response,
    };
  }

  const raw = await response.json();
  return { result: decodeResult(raw), response };
}

// settings is the object from lib/runnerSettings.js (getRunnerSettings()).
export async function runCode({ code, languageId, stdin = "", settings }) {
  if (settings?.useLocalJudge0 && settings.localJudge0Url) {
    return runLocal({
      code,
      languageId,
      stdin,
      baseUrl: settings.localJudge0Url,
      token: settings.localJudge0Token,
    });
  }
  return runHosted({ code, languageId, stdin });
}
