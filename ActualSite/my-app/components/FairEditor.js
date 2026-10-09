"use client";

// Client pieces of the club fair page (app/fair/page.js): the editor with a
// "you did it" card underneath, and a one-line snippet with a Copy button.

import { useState } from "react";
import Link from "next/link";
import CodeEditor from "./CodeEditor";

export function CopyLine({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: they can still type it.
    }
  }

  return (
    <div className="fair-copyline">
      <code>{text}</code>
      <button type="button" className="btn-ghost" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function DiscordLink({ url }) {
  if (!url) return null;
  return (
    <a href={url} className="btn-ghost" target="_blank" rel="noopener noreferrer">
      Join our Discord
    </a>
  );
}

function WinCard({ win, signedIn, discordUrl }) {
  if (!win) return null;

  if (win.mode === "submit" && win.points && !win.points.error) {
    return (
      <div className="fair-win">
        <h3>You did it, and it&apos;s on your account!</h3>
        <p>
          Every challenge on the site works just like this one. Try another, or see where you
          landed on the leaderboard.
        </p>
        <div className="fair-win-actions">
          <Link href="/problems" className="btn-primary">More challenges</Link>
          <Link href="/leaderboard" className="btn-ghost">Leaderboard</Link>
          <DiscordLink url={discordUrl} />
        </div>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="fair-win">
        <h3>It works! You just wrote a program.</h3>
        <p>Press <strong>Submit</strong> to run the hidden tests and put the points on your account.</p>
        {discordUrl && (
          <div className="fair-win-actions">
            <DiscordLink url={discordUrl} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fair-win">
      <h3>It works! You just wrote your first program.</h3>
      <p>
        Want to keep it? Make a free account (your Neumont email works), then come back and press{" "}
        <strong>Submit</strong> to earn your first points. Your code will still be here.
      </p>
      <div className="fair-win-actions">
        <Link href="/signup?returnTo=%2Ffair" className="btn-primary">Create an account</Link>
        <Link href="/login?returnTo=%2Ffair" className="btn-ghost">I already have one</Link>
        <DiscordLink url={discordUrl} />
      </div>
    </div>
  );
}

export default function FairEditor({ signedIn, discordUrl = "", ...editorProps }) {
  const [win, setWin] = useState(null);

  function handleGraded({ result, points, mode }) {
    const passedAll = result && result.total > 0 && result.passed === result.total;
    setWin(passedAll ? { mode, points } : null);
  }

  return (
    <div className="fair-editor">
      <CodeEditor {...editorProps} beginner onGraded={handleGraded} />
      <WinCard win={win} signedIn={signedIn} discordUrl={discordUrl} />
    </div>
  );
}
