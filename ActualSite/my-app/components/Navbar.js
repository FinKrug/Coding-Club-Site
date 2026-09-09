"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SettingsModal from "./SettingsModal";
import { getRunnerSettings, subscribeRunnerSettings } from "@/lib/runnerSettings";

function Navbar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setSettings(getRunnerSettings());
    return subscribeRunnerSettings(setSettings);
  }, []);

  const usingLocalTools = Boolean(
    settings && (settings.useLocalJudge0 || settings.useLocalLsp)
  );

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true">N</span>
          <span className="navbar-wordmark">
            Neumont
            <span>Coding Club</span>
          </span>
        </Link>

        <div className="navbar-links">
          <Link href="/" className="nav-link">
            Home
          </Link>
          <Link href="/problems" className="nav-link">
            Challenges
          </Link>
          <Link href="/resources" className="nav-link">
            Resources
          </Link>
          <button
            type="button"
            className="settings-trigger"
            onClick={() => setSettingsOpen(true)}
          >
            <span className="gear-icon" aria-hidden="true">
              ⚙
            </span>
            Run Settings
            {usingLocalTools && (
              <span className="local-dot" title="Using tools on your own machine" />
            )}
          </button>
        </div>
      </nav>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

export default Navbar;
