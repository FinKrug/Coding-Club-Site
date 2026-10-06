import Link from "next/link";
import siteInfo from "@/data/siteInfo";

export const metadata = {
  title: "Terms of Service — Neumont Coding Club",
  description: "The rules for using the Neumont Coding Club site.",
};

export default function TermsPage() {
  return (
    <div className="container legal-page">
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated {siteInfo.policiesUpdated}</p>

      <p>
        By creating an account or using this site, you agree to these terms. The site is a free, student-run
        project of the {siteInfo.name} for learning and practice.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>One account per person. Use your real name or one other members will recognize.</li>
        <li>Keep your password to yourself. You&apos;re responsible for what happens on your account.</li>
      </ul>

      <h2>Using the code runner fairly</h2>
      <p>The code runner is shared by every member, so please don&apos;t:</p>
      <ul>
        <li>try to break into, overload or misuse the code-running server or the site;</li>
        <li>submit code meant to cause harm, mine cryptocurrency, or reach other systems;</li>
        <li>cheat the points system, for example by exploiting bugs or using someone else&apos;s account.</li>
      </ul>
      <p>
        Found a bug or a security problem? Tell a club officer instead of using it. We&apos;ll appreciate it.
      </p>

      <h2>Points and the shop</h2>
      <ul>
        <li>Points are for fun and recognition. They have no cash value and can&apos;t be traded or sold.</li>
        <li>
          Officers may correct points earned by mistake or through a bug, and may adjust how many points
          challenges are worth.
        </li>
        <li>
          Shop items are available while the club offers them. Physical items like stickers depend on supply.
          Refund rules for each item are shown in the shop.
        </li>
      </ul>

      <h2>Your code</h2>
      <p>The code you write is yours. Challenges and site content belong to the club and their authors.</p>

      <h2>Breaking the rules</h2>
      <p>
        Officers may remove points, or suspend or delete accounts, that break these terms or are used to harass
        others.
      </p>

      <h2>No guarantees</h2>
      <p>
        The site is provided as-is by student volunteers. It may have bugs or downtime, and features (including
        points) may change. We do our best, but can&apos;t promise it will always be available or error-free.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change, we&apos;ll update the date at the top of this page. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
