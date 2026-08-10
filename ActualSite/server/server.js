const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JUDGE0_URL = process.env.JUDGE0_URL;

app.get("/", (req, res) => {
  res.json({
    message: "Neumont Coding Club compiler API is running!"
  });
});

app.post("/run", async (req, res) => {
  try {
    const {
      code,
      languageId,
      stdin = ""
    } = req.body;

    if (!code) {
      return res.status(400).json({
        error: "No code provided."
      });
    }

    if (!languageId) {
      return res.status(400).json({
        error: "No language selected."
      });
    }

    const response = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: stdin,

          // Safety limits
          cpu_time_limit: 2,
          memory_limit: 128000
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Judge0 error:", errorText);

      return res.status(response.status).json({
        error: "Judge0 returned an error.",
        details: errorText
      });
    }

    const result = await response.json();

    res.json(result);

  } catch (error) {
    console.error("Compiler error:", error);

    res.status(500).json({
      error: "Failed to execute code.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});