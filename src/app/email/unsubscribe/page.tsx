import { redirect } from "next/navigation";

export const metadata = {
  title: "Unsubscribe",
};

type Props = {
  searchParams: Promise<{ email?: string | string[] }>;
};

/** Old path — keep working for mail already sent. */
export default async function EmailUnsubscribeRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.email) ? params.email[0] : params.email;
  const email = raw?.trim().toLowerCase() ?? "";
  if (email && email.includes("@")) {
    redirect(`/unsubscribe?email=${encodeURIComponent(email)}`);
  }
  redirect("/unsubscribe");
}
