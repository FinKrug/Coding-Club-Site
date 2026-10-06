// Talks to a Judge0 server. Shared by the site (lib/judge0.js) and the
// npm scripts, so it takes its settings as arguments instead of reading env.

function toBase64(text) {
  return Buffer.from(String(text ?? ""), "utf-8").toString("base64");
}

function fromBase64(value) {
  if (!value) return value;
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return value;
  }
}

export class Judge0Error extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Runs one program and waits for the result. Returns Judge0's result with
// stdout / stderr / compile_output / message decoded to plain text.
export async function submitToJudge0({ url, token, source, languageId, stdin = "", cpuTimeLimit = 2, memoryLimitKb = 128000 }) {
  if (!url) throw new Judge0Error("JUDGE0_URL is not set.", 500);

  // Base64 so any character a keyboard or autocorrect introduces (smart
  // quotes, em dashes, emoji, etc.) is transmitted safely.
  const response = await fetch(`${url.replace(/\/$/, "")}/submissions?base64_encoded=true&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Auth-Token": token } : {}),
    },
    body: JSON.stringify({
      source_code: toBase64(source),
      language_id: languageId,
      stdin: toBase64(stdin),
      // Safety limits
      cpu_time_limit: cpuTimeLimit,
      wall_time_limit: Math.min(20, cpuTimeLimit * 3 + 2),
      memory_limit: memoryLimitKb,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Judge0Error("Judge0 returned an error.", response.status, details);
  }

  const result = await response.json();
  return {
    ...result,
    stdout: fromBase64(result.stdout),
    stderr: fromBase64(result.stderr),
    compile_output: fromBase64(result.compile_output),
    message: fromBase64(result.message),
  };
}
