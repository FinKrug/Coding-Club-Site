import { ResetForm } from "@/components/AuthForms";
import { safeReturnTo } from "@/lib/oauth";

export const metadata = { title: "Set a new password — Neumont Coding Club" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }) {
  const params = await searchParams;
  return (
    <div className="container auth-page">
      <ResetForm email={typeof params?.email === "string" ? params.email : ""} returnTo={safeReturnTo(params?.returnTo)} />
    </div>
  );
}
