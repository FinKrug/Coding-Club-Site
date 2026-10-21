// The club's weekly meeting, shown on the home page with a live
// "next meeting" countdown (components/NextMeeting.js).
//
// To set up a new quarter, change firstDate and lastDate (YYYY-MM-DD).
// Meetings repeat every 7 days from firstDate through lastDate, so
// firstDate's weekday is the meeting day. Leave time/location empty to
// hide them, or fill them in, e.g. time: "6:00 PM", location: "Room 204".
const meetings = {
  name: "Weekly Club Meeting",
  firstDate: "2026-10-21",
  lastDate: "2026-12-09",
  time: "",
  location: "",
};

export default meetings;
