"use client";

// Home page "Upcoming Events": the weekly meeting with a live countdown to
// the next one, and a button that lists every date in the quarter.
//
// The countdown is worked out in the visitor's browser (in club time), so
// the home page itself stays fully static: no server work per visit. Until
// the browser takes over, the schedule summary shows on its own.

import { useEffect, useState } from "react";
import meetings from "@/data/meetings";
import { clubToday, countdownText, formatMeetingDate, meetingStatus } from "@/lib/meetings";

export default function NextMeeting() {
  const [today, setToday] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setToday(clubToday());
    // Keep "Today!" / "Tomorrow" right if the page stays open past midnight.
    const timer = setInterval(() => setToday(clubToday()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const status = today ? meetingStatus(meetings, today) : null;
  const short = { month: "short", day: "numeric" };
  const extras = [meetings.time, meetings.location].filter(Boolean).join(" · ");
  const weekday = formatMeetingDate(meetings.firstDate, { weekday: "long" });

  return (
    <div className="next-meeting">
      <span className="event-name">{meetings.name}</span>
      <span className="event-when">
        Every {weekday} · {formatMeetingDate(meetings.firstDate, short)} – {formatMeetingDate(meetings.lastDate, short)}
        {extras && ` · ${extras}`}
      </span>

      {status && status.state !== "done" && (
        <div className={`next-meeting-callout${status.state === "today" ? " is-today" : ""}`}>
          <span className="next-meeting-label">
            {status.number === 1 ? "First meeting" : "Next meeting"}
          </span>
          <span className="next-meeting-date">{formatMeetingDate(status.next)}</span>
          <span className="next-meeting-countdown">{countdownText(status.daysAway)}</span>
          <span className="next-meeting-count">
            Meeting {status.number} of {status.total}
          </span>
        </div>
      )}

      {status && status.state === "done" && (
        <div className="next-meeting-callout is-done">
          That&apos;s a wrap for this quarter. See you next quarter!
        </div>
      )}

      {status && (
        <>
          <button
            type="button"
            className="next-meeting-toggle"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Hide dates" : `See all ${status.total} dates`}
          </button>

          {showAll && (
            <ol className="meeting-dates">
              {status.dates.map((date) => {
                const kind = date < today ? "is-past" : date === status.next ? "is-next" : "";
                return (
                  <li key={date} className={kind}>
                    {formatMeetingDate(date)}
                    {kind === "is-next" && <span className="meeting-dates-tag">{countdownText(status.daysAway)}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
