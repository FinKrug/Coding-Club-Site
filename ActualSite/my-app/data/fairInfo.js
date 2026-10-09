// Settings for the club fair page (/fair).
const fairInfo = {
  // The beginner challenge shown on the page (its id in data/challenges.json
  // and the database). Run `npm run db:seed` once so it exists in MongoDB.
  challengeId: 3,

  // The club's Discord invite. Meeting times, events and announcements all
  // live there, so every "find out more" link on the fair page points here.
  // Use an invite that never expires (Discord: Invite People -> Edit invite
  // link -> Expire after: Never).
  discordUrl: "https://discord.gg/kxv3FAP7k7",
};

export default fairInfo;
