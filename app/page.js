"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import TypingTest from "@/components/TypingTest";

export default function Home() {
  return (
    <RequireAuth>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1">
          <TypingTest />
        </main>
      </div>
    </RequireAuth>
  );
}
