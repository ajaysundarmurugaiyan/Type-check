"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Wraps protected pages: shows a loader while auth resolves, redirects to
// /login if signed out, otherwise renders the page.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return children;
}
