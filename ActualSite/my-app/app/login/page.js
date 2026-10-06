import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getSession } from "@/lib/session";
import { safeReturnTo } from "@/lib/oauth";
import { googleSignInEnabled } from "@/lib/authHelpers";

export const metadata = { title: "Sign in — Neumont Coding Club" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo);
  if (await getSession()) redirect(returnTo);
  return (
    <div className="container auth-page">
      <LoginForm returnTo={returnTo} googleEnabled={googleSignInEnabled()} />
    </div>
  );
}
