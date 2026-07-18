"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  const link = (href, label) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-indigo-600 text-white"
            : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-indigo-600">TypeTest</span>
        <nav className="flex items-center gap-1">
          {link("/", "Practice")}
          {link("/dashboard", "Dashboard")}
          {link("/history", "History")}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <span className="hidden max-w-[180px] truncate text-sm text-slate-500 sm:block">
            {user.email || user.displayName}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
