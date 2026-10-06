import { redirect } from "next/navigation";
import { SignupForm } from "@/components/AuthForms";
import { getSession } from "@/lib/session";
import { safeReturnTo } from "@/lib/oauth";
import { googleSignInEnabled } from "@/lib/authHelpers";

export const metadata = { title: "Create an account — Neumont Coding Club" };
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo);
  if (await getSession()) redirect(returnTo);
  return (
    <div className="container auth-page">
      <SignupForm returnTo={returnTo} googleEnabled={googleSignInEnabled()} />
    </div>
  );
}
