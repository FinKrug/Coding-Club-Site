// Settings for the club fair page (/fair).
import siteInfo from "./siteInfo";

const fairInfo = {
  // The on/off switch for everything fair-related. While it's false:
  //   - /fair is a 404 (so old QR codes lead nowhere),
  //   - the home page doesn't link to it,
  //   - the fair challenge is hidden from the challenges list and can't be
  //     opened, run or submitted (points already earned on it are kept),
  //   - guests can't run code anywhere (they could only on the fair challenge).
  // Set it to true and redeploy for the next fair.
  enabled: false,

  // The beginner challenge shown on the page (its id in data/challenges.json
  // and the database). Run `npm run db:seed` once so it exists in MongoDB.
  challengeId: 3,

  // The club's Discord invite. Meeting times, events and announcements all
  // live there, so every "find out more" link on the fair page points here.
  // Change it in data/siteInfo.js.
  discordUrl: siteInfo.discordUrl,
};

export default fairInfo;
