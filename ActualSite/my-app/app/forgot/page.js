import { ForgotForm } from "@/components/AuthForms";
import { safeReturnTo } from "@/lib/oauth";

export const metadata = { title: "Reset your password — Neumont Coding Club" };
export const dynamic = "force-dynamic";

export default async function ForgotPage({ searchParams }) {
  const params = await searchParams;
  return (
    <div className="container auth-page">
      <ForgotForm returnTo={safeReturnTo(params?.returnTo)} />
    </div>
  );
}
