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

    const response = await fetch(
      `${judge0Url}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin,

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
    return Response.json(result);

  } catch (error) {
    console.error("Compiler error:", error);

    return Response.json(
      { error: "Failed to execute code.", details: error.message },
      { status: 500 }
    );
  }
}
