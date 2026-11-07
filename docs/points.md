# Points System

The Coding Club platform awards points to members when they successfully pass all automated test cases for a challenge.

---

## Scoring Mechanics

1. **Award Criteria**: Points are earned upon clicking **Submit** and passing 100% of the tests (including hidden tests). "Run Code" does not award points.
2. **Per Challenge, Per Language**:
   - Points are awarded **once per challenge per language**.
   - Solving a challenge in Python awards its Python points. Solving the same challenge in Java later earns the Java points as well.
   - Re-submitting in an already-solved language does not duplicate points.
3. **Language Multipliers**:
   - **Priority Languages (1.5×)**: Submissions in **Python**, **Java**, or **C#** earn `round(points * 1.5)`.
   - **Standard Languages (1.0×)**: Other supported languages earn the standard base point value.
   - Priority multipliers are defined in `lib/judge/languageList.mjs` (`PRIORITY_MULTIPLIER` and `priority: true`).

---

## Data Model & Deduplication

- **`solves` collection**: Each awarded solution is recorded with:
  - `userId`: MongoDB ObjectID of the member
  - `challengeId`: ID of the completed challenge
  - `language`: Normalized language identifier
  - `points`: Number of points awarded for this solution
  - `solvedAt`: Timestamp
- **Double-Submit Prevention**: A compound unique index on `(userId, challengeId, language)` guarantees points cannot be duplicated, even under concurrent or double-clicked requests.
- **User Running Total**: `users.points` caches the user's lifetime total for fast display in the navigation bar and leaderboard.

---

## Maintenance & Recalculation

If points ever need verification or synchronization:

1. **Check Discrepancies**:
   ```bash
   npm run points:recalc
   ```
   Reports any users whose cached `users.points` does not match the sum of their records in `solves`.

2. **Rebuild Point Totals**:
   ```bash
   npm run points:recalc -- --fix
   ```
   Recalculates and updates `users.points` across the database to strictly match valid `solves`.

> [!NOTE]
> Manual edits to `users.points` in MongoDB Atlas will be overwritten by running `points:recalc -- --fix`. To permanently adjust points, add or modify corresponding records in the `solves` collection.
