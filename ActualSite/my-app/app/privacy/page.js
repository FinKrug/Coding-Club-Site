import Link from "next/link";
import siteInfo from "@/data/siteInfo";

export const metadata = {
  title: "Privacy Policy — Neumont Coding Club",
  description: "What the Neumont Coding Club site stores about you and why.",
};

function Contact() {
  return siteInfo.contactEmail ? (
    <a href={`mailto:${siteInfo.contactEmail}`}>{siteInfo.contactEmail}</a>
  ) : (
    <>a club officer of the {siteInfo.name}</>
  );
}

export default function PrivacyPage() {
  return (
    <div className="container legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated {siteInfo.policiesUpdated}</p>

      <p>
        This site is run by students of the {siteInfo.name} at Neumont University. It exists so members can
        practice coding challenges and earn points. We collect only what the site needs to work, we don&apos;t
        show ads, and we never sell your information.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address. If you sign in with Google, we also store
          your Google profile picture and the ID Google gives your account. If you sign up with email, we store
          your password only as a salted, scrambled hash. We can&apos;t see or recover your actual password.
        </li>
        <li>
          <strong>Your progress:</strong> which challenges you&apos;ve solved, in which programming language,
          when, and the points you&apos;ve earned. Once the points shop opens, it will also include what
          you&apos;ve bought or refunded.
        </li>
        <li>
          <strong>Sign-in safety:</strong> when you last signed in, and a count of recent wrong password attempts
          (used to temporarily lock an account against password guessing). One-time email codes are deleted after
          they&apos;re used or expire (within 15 minutes).
        </li>
      </ul>

      <h2>Information from Google</h2>
      <p>
        If you choose &quot;Continue with Google&quot;, Google shares the following with us, and only after you agree
        on Google&apos;s sign-in screen. The site asks for the basic <code>openid</code>, <code>email</code> and{" "}
        <code>profile</code> permissions and nothing else:
      </p>
      <ul>
        <li>your name, which is shown on your account page;</li>
        <li>your email address, used to identify your account and link it with an email + password sign-in for the same address;</li>
        <li>your profile picture, shown next to your points in the navigation bar;</li>
        <li>your Google account ID, so we recognize you the next time you sign in.</li>
      </ul>
      <p>
        We use this information only to create your account, sign you in and show your profile on this site. We
        don&apos;t access your Gmail, contacts, files, calendar or anything else in your Google account. We
        don&apos;t sell Google user data, share it with anyone except the services listed below that run the
        site, or use it for advertising, for training AI or machine-learning models, or to make credit or
        lending decisions.
      </p>
      <p>
        The {siteInfo.name}&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2>Your code</h2>
      <p>
        When you press Run Code or Submit, your code is sent to the club&apos;s own code-running server to be
        compiled, run and checked against the challenge&apos;s tests. The site doesn&apos;t keep a copy of your
        code afterwards. Unsaved work in the editor is saved only in your own browser, so you don&apos;t lose
        it when you reload, and it never leaves your device.
      </p>

      <h2>Cookies</h2>
      <p>
        We use one cookie to keep you signed in, plus a short-lived one during &quot;Continue with Google&quot;
        sign-in. There are no advertising or tracking cookies.
      </p>

      <h2>Services we use</h2>
      <p>We don&apos;t sell or rent your information. These companies process it for us, only so the site can run:</p>
      <ul>
        <li><strong>Cloudflare</strong> hosts the site (and, like any web host, briefly logs requests).</li>
        <li><strong>MongoDB Atlas</strong> stores the database described above.</li>
        <li><strong>Resend</strong> delivers the sign-up and password-reset code emails.</li>
        <li><strong>Google</strong>, only if you choose &quot;Continue with Google&quot;, confirms who you are.</li>
      </ul>

      <h2>Who can see your information</h2>
      <p>
        Club officers who maintain the site can see account and progress information to run the club (for
        example, to fix a points problem or hand out a prize). Your name and points may be shown to other members
        if the site adds features like a leaderboard. Your email address and password never are.
      </p>

      <h2>Keeping your data safe</h2>
      <ul>
        <li>Everything between your browser and the site, and between the site and our database, is encrypted in transit (HTTPS/TLS).</li>
        <li>The database (MongoDB Atlas) encrypts stored data at rest, and only the club officers who maintain the site can access it.</li>
        <li>Passwords are never stored. Only a salted hash is kept, mixed with a secret key that isn&apos;t stored in the database.</li>
        <li>Sign-in cookies can&apos;t be read by scripts on the page and are only sent over HTTPS.</li>
      </ul>

      <h2>How long we keep it, and deleting it</h2>
      <p>
        We keep your account information and progress for as long as your account exists, so your points and solved
        challenges stay with you. One-time email codes are deleted within 15 minutes. You can ask us at any time to
        delete your account. We&apos;ll delete your account and everything linked to it (including any information
        received from Google) within 30 days. You can also ask for a copy of what we store about you. To do either,
        contact <Contact />.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data: <Contact />. The site is run by the {siteInfo.name}, a student
        organization at Neumont University.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we&apos;ll update the date at the top of this page. See also our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </div>
  );
}
