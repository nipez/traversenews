"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-white/70 hover:text-white"
      onClick={async () => {
        await fetch("/api/desk/logout", { method: "POST" });
        router.push("/desk/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
