import { VerifyForm } from "@/components/AuthForms";
import { safeReturnTo } from "@/lib/oauth";

export const metadata = { title: "Check your email — Neumont Coding Club" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }) {
  const params = await searchParams;
  return (
    <div className="container auth-page">
      <VerifyForm email={typeof params?.email === "string" ? params.email : ""} returnTo={safeReturnTo(params?.returnTo)} />
    </div>
  );
}
