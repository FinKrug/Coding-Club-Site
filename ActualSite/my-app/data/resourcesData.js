// Resources shown on /resources (the index/hub) and /resources/[slug] (one
// detail page per entry). Add a new object here to add a new resource —
// both pages render automatically from this list, no page code to touch
// for a typical addition.
//
// Text fields go through components/InlineText.js, which understands
// `code`, **bold**, and [label](url) (external links open in a new tab
// automatically; internal ones like /resources/docker don't).
//
// Shape:
//   slug          URL segment (/resources/<slug>)
//   title         page + card heading
//   tag           short label shown on the index card ("Prerequisite", "Download")
//   summary       one line shown on the index card
//   intro         longer paragraph shown at the top of the detail page
//   meta          short line shown next to the CTA button (size, license, etc.)
//   cta           { label, href, download?, external? }
//   context       optional "Why would I want this?" paragraph
//   instructions  optional ordered list of setup steps
//   note          optional callout at the bottom of the detail page
//   beginnerNote  optional callout shown near the top, for readers who may
//                 not need this page yet — reassures true beginners and
//                 points them somewhere simpler

const resources = [
  {
    slug: "getting-started",
    title: "New to Coding? Start Here",
    tag: "Start Here",
    summary: "No installs, no IDE, no setup — just open a problem and start writing code in your browser.",
    intro:
      "If you're new to coding, the good news is you don't need to install anything to get started. This site has a built-in code editor and a **Run Code** button right in your browser — that's all you need for your first problem.",
    meta: "Works in any modern browser — nothing to download",
    cta: {
      label: "Go to Challenges",
      href: "/problems"
    },
    context:
      "Normally, programmers write code in a program called an **IDE** (\"Integrated Development Environment\") installed on their own computer, like VS Code or IntelliJ. You do not need one of those to use this site. Every challenge already includes a code editor in the page itself, and clicking **Run Code** sends your code to a server that runs it and shows you the output — no installation required.",
    instructions: [
      "Click **Go to Challenges** above (or **Challenges** in the top navigation bar).",
      "Pick any problem marked **Easy** — these are written for people writing their first few programs.",
      "Read the problem description, then write your solution in the code editor on the page.",
      "Click **Run Code** to see your output. If it's not quite right yet, that's completely normal — tweak your code and run it again as many times as you like."
    ],
    note:
      "Everything else on this Resources page (Docker, the Local Runner Kit) is optional, advanced setup for people who want to run parts of this site on their own computer. You will not need any of it to start learning or to work through challenges."
  },
  {
    slug: "docker",
    title: "Install Docker",
    tag: "Prerequisite",
    summary: "What Docker is, why the download below needs it, and how to install it.",
    intro:
      "Docker lets you run software in lightweight, isolated \"containers\" — pre-packaged environments that include everything a program needs, without installing all of it directly on your computer. The Local IntelliSense Kit below needs Docker Desktop installed first.",
    meta: "Free for personal use, education, and small teams",
    cta: {
      label: "Download Docker Desktop",
      href: "https://www.docker.com/products/docker-desktop/",
      external: true
    },
    beginnerNote:
      "This page is optional and aimed at more advanced setups. If you're just getting started with coding, you don't need Docker at all — head over to [New to Coding? Start Here](/resources/getting-started) instead.",
    instructions: [
      "Go to [Docker Desktop](https://www.docker.com/products/docker-desktop/) and download the installer for your operating system (Windows, Mac, or Linux).",
      "Run the installer and follow the prompts, using the defaults.",
      "Open Docker Desktop and wait for it to report that it's running (the whale icon in your system tray/menu bar stops animating).",
      "Verify it worked by opening a terminal (on Windows, this is Command Prompt or PowerShell; on Mac, it's the Terminal app) and running `docker --version` — you should see a version number, not a \"command not found\" error."
    ],
    note:
      "Larger organizations may need a paid Docker subscription — see [Docker's pricing page](https://www.docker.com/pricing/) for current terms. For personal or student use, the free tier covers this."
  },
  {
    slug: "local-runner-kit",
    title: "Local IntelliSense Kit",
    tag: "Download",
    summary: "Run IntelliSense's language servers on your own machine instead of our hosted gateway.",
    intro:
      "A Docker Compose setup for the IntelliSense gateway — real completions, hovers and diagnostics for Python, C/C++, Rust, Go and Java — pre-configured to work with this site's Run Settings.",
    meta: ".zip · Docker Compose + IntelliSense source",
    cta: {
      label: "Download",
      href: "/downloads/local-dev-tools.zip",
      download: true
    },
    beginnerNote:
      "This is an optional, advanced download for people who already have a challenge or two under their belt and want more control over their setup. If you're brand new here, you don't need this yet — see [New to Coding? Start Here](/resources/getting-started) instead.",
    context:
      "By default, IntelliSense talks to a gateway we host. Running your own copy locally is useful if you're offline or just want to see how it works under the hood. Nothing about using the site normally requires this — it's entirely optional. (\"Run Code\" always uses our hosted compiler — this download doesn't include a code runner; see the note below for why.)",
    instructions: [
      "Make sure [Docker](/resources/docker) is installed and running.",
      "Download the zip above and unzip it anywhere on your computer.",
      "Open a terminal (on Windows, this is Command Prompt or PowerShell; on Mac, it's the Terminal app) in that folder and run `docker compose up -d --build`. The first run takes a few minutes — it's installing a JDK, Go, clangd, and a few other language servers.",
      "On the site, click the gear icon (**Run Settings**) in the navbar, turn on **Local IntelliSense**, and use **Test connection** — it should say \"Connected\"."
    ],
    note:
      "This used to also include a self-hosted Judge0 (the code runner), removed because Judge0's sandboxing needs the legacy cgroup v1 hierarchy, which Windows/WSL2 no longer supports at all as of WSL version 2.5.1 — so it simply can't run under Docker on Windows anymore. \"Run Code\" always uses our hosted Judge0 now; that has nothing to do with IntelliSense, which works fine locally regardless. The zip includes a full `README.md` with the details plus troubleshooting steps for IntelliSense itself."
  }
];

export default resources;
