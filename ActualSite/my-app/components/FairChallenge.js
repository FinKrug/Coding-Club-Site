"use client";

// The interactive part of the club fair page (app/fair/page.js): language
// buttons, a step-by-step guide for the picked language (data/fairGuides.js),
// a live "coach" that reacts to what the visitor types, a "give up" answer
// for that language, and the editor with a "you did it" card underneath.

import { useState } from "react";
import Link from "next/link";
import CodeEditor from "./CodeEditor";
import InlineText from "./InlineText";
import { FAIR_GUIDES, buildAnswer, coachTip } from "@/data/fairGuides";
import { LANGUAGE_LIST } from "@/lib/judge/languageList.mjs";

function CopyButton({ text }) {
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
    <button type="button" className="btn-ghost" onClick={copy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CopyLines({ lines }) {
  const text = lines.join("\n");
  return (
    <div className="fair-copyline">
      {lines.length > 1 ? <pre>{text}</pre> : <code>{text}</code>}
      <CopyButton text={text} />
    </div>
  );
}

function DiscordLink({ url, className = "btn-ghost" }) {
  if (!url) return null;
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer">
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

function Step({ title, done = false, star = false, children }) {
  return (
    <li className={`${done ? "done" : ""} ${star ? "star" : ""}`}>
      <h3>{title}</h3>
      {children}
    </li>
  );
}

export default function FairChallenge({
  signedIn,
  discordUrl = "",
  challengeId,
  starters,
  supportedLanguages,
  solvedLanguages,
  usedLanguages,
  basePoints,
}) {
  const languages = LANGUAGE_LIST.filter((l) => supportedLanguages.includes(l.id) && FAIR_GUIDES[l.id]);
  const [languageId, setLanguageId] = useState(languages[0]?.id ?? 71);
  const [code, setCode] = useState(starters[languages[0]?.id] || "");
  const [win, setWin] = useState(null); // { mode, points, languageId } after a fully passing run

  const guide = FAIR_GUIDES[languageId] || FAIR_GUIDES[71];
  const starter = starters[languageId] || "";
  const answer = buildAnswer(starter, guide);
  const tip = coachTip(code, languageId, starter);
  const passedHere = win && win.languageId === languageId;

  function handleLanguageChange(nextId) {
    setLanguageId(nextId);
    setWin(null);
  }

  function handleGraded({ result, points, mode }) {
    const passedAll = result && result.total > 0 && result.passed === result.total;
    setWin(passedAll ? { mode, points, languageId } : null);
  }

  return (
    <div className="fair-layout">
      <div className="fair-steps">
        <ol>
          <Step title="Pick a language" done>
            <p>Any of them works. Not sure? Python is the easiest place to start.</p>
            <div className="fair-langs" role="group" aria-label="Programming language">
              {languages.map((language) => {
                const info = FAIR_GUIDES[language.id];
                return (
                  <button
                    key={language.id}
                    type="button"
                    className={`fair-lang ${language.id === languageId ? "active" : ""}`}
                    aria-pressed={language.id === languageId}
                    onClick={() => handleLanguageChange(language.id)}
                  >
                    {info.name}
                    {info.tag && <span className="fair-lang-tag">{info.tag}</span>}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step title={`Meet the ${guide.name} code`}>
            {guide.meet.map((text, index) => (
              <p key={index}>
                <InlineText text={text} />
              </p>
            ))}
          </Step>

          <Step title="Type it in" done={tip?.kind === "good" || passedHere}>
            <p>
              <InlineText text={guide.where} />
            </p>
            <CopyLines lines={guide.answer} />
            <ul className="fair-notes">
              {guide.notes.map((text, index) => (
                <li key={index}>
                  <InlineText text={text} />
                </li>
              ))}
            </ul>
            {tip && !passedHere && (
              <div className={`fair-coach ${tip.kind}`} aria-live="polite">
                <span className="fair-coach-label">Coach</span>
                <span>
                  <InlineText text={tip.text} />
                </span>
              </div>
            )}
          </Step>

          <Step title="Press Run Code" done={passedHere}>
            <p>We&apos;ll try your function on a couple of names. Green means it works.</p>
          </Step>

          <Step
            title={signedIn ? "Press Submit for points" : "Earn points (optional)"}
            done={passedHere && win.mode === "submit"}
          >
            <p>
              {signedIn
                ? "Submit runs a few hidden tests too. Pass them and the points go on your account and the leaderboard."
                : "Make a free account (your Neumont email works), then press Submit to earn your first points. Your code stays here while you sign up."}
            </p>
          </Step>

          <Step title="Bonus: break it on purpose" star>
            <p>
              Change <code>&quot;Hello, &quot;</code> to <code>&quot;Hey, &quot;</code> and run it
              again. The tests fail, because they expect &quot;Hello&quot;. That&apos;s how
              programmers find out when something changed by accident.
            </p>
          </Step>
        </ol>

        {/* key: switching languages closes it again and shows that language's answer */}
        <details className="fair-stuck" key={languageId}>
          <summary>Give up? Here&apos;s the answer in {guide.name}</summary>
          <div className="fair-answer">
            <pre>{answer}</pre>
            <CopyButton text={answer} />
          </div>
          <p>
            No shame in it. Read it line by line, then type it yourself instead of pasting. That&apos;s
            how it sticks. Or wave at someone at the booth
            {discordUrl && (
              <>
                {" "}or ask in our{" "}
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  Discord
                </a>
              </>
            )}
            . We&apos;re happy to help.
          </p>
        </details>
      </div>

      <div className="fair-editor">
        <CodeEditor
          challengeId={challengeId}
          hasTests
          starters={starters}
          supportedLanguages={supportedLanguages}
          solvedLanguages={solvedLanguages}
          usedLanguages={usedLanguages}
          basePoints={basePoints}
          signedIn={signedIn}
          guestCanRun
          beginner
          requestedLanguageId={languageId}
          onLanguageChange={handleLanguageChange}
          onCodeChange={setCode}
          onGraded={handleGraded}
        />
        <WinCard win={win} signedIn={signedIn} discordUrl={discordUrl} />
      </div>
    </div>
  );
}
