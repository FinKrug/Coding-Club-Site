# Challenges Guide

Challenges in Coding Club are stored directly in the `challenges` collection in MongoDB Atlas. Adding or updating a challenge requires no code changes or redeployments—it updates on the site immediately.

---

## Initial Setup

From `ActualSite/my-app`, ensure collection schema validation and starter challenges are seeded:

```bash
npm run db:setup   # Applies MongoDB JSON schema validation rules
npm run db:seed    # Populates starter challenges from data/challenges.json
```

To update starter challenges (#1 and #2) with automated test cases:
```bash
npm run db:seed -- --update
```

---

## Adding a New Challenge

1. In MongoDB Atlas, go to your cluster → **Browse Collections** (or Data Explorer).
2. Select database `coding-club` → collection `challenges`.
3. Click **Insert Document**, switch view to **JSON** (`{}`), and paste:

```json
{
  "id": 3,
  "title": "Reverse a String",
  "difficulty": "Easy",
  "week": "Week 2",
  "points": 10,
  "published": true,
  "description": "Write a function that returns the given string backwards.\n\nFor example, `hello` becomes `olleh`.",
  "function": {
    "name": "reverseString",
    "params": [{ "name": "s", "type": "string" }],
    "returns": "string"
  },
  "tests": [
    { "args": ["hello"], "expected": "olleh" },
    { "args": [""], "expected": "" },
    { "args": ["racecar!"], "expected": "!racecar", "hidden": true },
    { "args": ["a b  c"], "expected": "c  b a", "hidden": true }
  ]
}
```

4. Modify the values and click **Insert**. The challenge becomes immediately live at `/problems/3`.

---

## Field Reference

| Field | Required? | Description |
| --- | --- | --- |
| `id` | Yes | Unique positive integer. Defines the URL slug (`/problems/<id>`). |
| `title` | Yes | Challenge title. |
| `difficulty` | Yes | Must be exactly `"Easy"`, `"Medium"`, or `"Hard"`. |
| `description` | Yes | Problem statement in Markdown (`\n\n` for paragraphs, backticks for code). |
| `function` | Required for test runner | Definition of function name, parameters, and return type. |
| `tests` | Required for test runner | Array of test cases. |
| `week` | No | Grouping label for challenges list (e.g. `"Week 2"`, defaults to `"Week 1"`). |
| `points` | No | Base points for solving (defaults to `10`). Priority languages earn 1.5×. |
| `timeLimitSeconds` | No | Execution timeout (1 to 10 seconds, defaults to 2). |
| `published` | No | Set to `false` to draft or hide a challenge. |
| `examples` | No | Explicit examples array `[{ "input": "...", "output": "..." }]`. Defaults to visible tests if omitted. |

> [!NOTE]
> If MongoDB Atlas returns **"Document failed validation"**, check that all fields match their schema requirements (e.g. capitalized `"difficulty": "Easy"`). A duplicate `id` fails with a `"duplicate key"` error.

---

## Writing Tests & Function Signatures

### Test Runner Execution
- **Run Code**: Runs only public test cases (`hidden: false` or omitted) and displays inputs, expected vs. received output, and standard console output.
- **Submit**: Evaluates against **all** tests, including `"hidden": true`. Hidden test results only indicate pass/fail status without revealing input arguments or expected results, preventing hardcoding.

### Supported Data Types
Types supported for `params` and `returns`:
- Primitive types: `int`, `long`, `double`, `bool`, `string`
- Array types: `int[]`, `string[]`, `bool[]`, etc.
- Grid / matrix types: `int[][]`, `string[][]`, etc.

Test arguments and return values should be specified in standard JSON format (`5`, `2.5`, `true`, `"text"`, `[1, 2, 3]`, `[[1, 2], [3, 4]]`).

### Formatting Rules & Options
- **Floating Point Comparison**: `double` outputs are evaluated within an epsilon of `0.000001` to prevent precision discrepancy failures.
- **Unordered Collections**: Add `"anyOrder": true` within the `function` definition when array order does not matter.
- **Language Compatibility**: C does not support multidimensional dynamic arrays (`[][]`). Challenges using matrices will omit C from the available languages list.
- **Reserved Identifier Names**: Function and parameter names must not conflict with reserved words across any of the 9 supported languages (e.g. avoid `string`, `type`, `len`, `new`, `default`).

---

## Verification & Self-Testing

From `ActualSite/my-app`:

1. **Validate All Challenge Definitions**:
   ```bash
   npm run db:check
   ```
   Scans every challenge in the database for valid structure and tests.

2. **Run Language Runner Self-Tests**:
   ```bash
   npm run judge:selftest
   ```
   Submits sample reference solutions in all 9 supported languages to the Judge0 instance to verify compiler and sandbox functionality.
