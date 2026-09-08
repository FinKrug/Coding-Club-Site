export async function GET() {
  return Response.json({
    message: "Neumont Coding Club compiler API is running!"
  });
}

export async function POST(request) {
  try {
    const { code, languageId, stdin = "" } = await request.json();

    if (!code) {
      return Response.json(
        { error: "No code provided." },
        { status: 400 }
      );
    }

    if (!languageId) {
      return Response.json(
        { error: "No language selected." },
        { status: 400 }
      );
    }

    const judge0Url = process.env.JUDGE0_URL;
    const judge0AuthToken = process.env.JUDGE0_AUTH_TOKEN;

    // Encode as base64 so that any character a keyboard or autocorrect
    // introduces (smart quotes, em dashes, emoji, etc.) is transmitted
    // safely, regardless of device.
    const response = await fetch(
      `${judge0Url}/submissions?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(judge0AuthToken ? { "X-Auth-Token": judge0AuthToken } : {})
        },
        body: JSON.stringify({
          source_code: Buffer.from(code, "utf-8").toString("base64"),
          language_id: languageId,
          stdin: Buffer.from(stdin, "utf-8").toString("base64"),

          // Safety limits
          cpu_time_limit: 2,
          memory_limit: 128000
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Judge0 error:", errorText);

      return Response.json(
        { error: "Judge0 returned an error.", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    const decodeField = (value) => {
      if (!value) return value;
      try {
        return Buffer.from(value, "base64").toString("utf-8");
      } catch {
        return value;
      }
    };

    return Response.json({
      ...result,
      stdout: decodeField(result.stdout),
      stderr: decodeField(result.stderr),
      compile_output: decodeField(result.compile_output),
      message: decodeField(result.message)
    });

  } catch (error) {
    console.error("Compiler error:", error);

    return Response.json(
      { error: "Failed to execute code.", details: error.message },
      { status: 500 }
    );
  }
}
