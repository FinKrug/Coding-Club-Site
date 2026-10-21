// When each week's challenges unlock.
//
// A challenge whose "week" is "Week N" stays hidden until the Monday of
// week N, counting from week1Start, and appears at midnight Utah time.
// With week1Start "2026-10-05":
//   Week 1 -> Mon, Oct 5   Week 2 -> Mon, Oct 12   Week 3 -> Mon, Oct 19 ...
// Challenges with any other week label (e.g. "Club Fair") are always shown.
//
// New quarter? Set week1Start to the Monday the quarter's Week 1 opens,
// then redeploy. To hold back a single challenge, give it
// "published": false in the database instead.
const challengeSchedule = {
  week1Start: "2026-10-05",
};

export default challengeSchedule;
