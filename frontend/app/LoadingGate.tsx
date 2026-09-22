"use client";

import { useEffect, useState } from "react";

export default function LoadingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#e8f8df]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 25%, rgba(170,244,153,.42), transparent 30%), radial-gradient(circle at 82% 70%, rgba(105,221,151,.24), transparent 34%), linear-gradient(135deg,#effbe8 0%,#dff6d8 48%,#c9f0cb 100%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-5 h-20 w-20 overflow-hidden rounded-[24px] border border-emerald-300/20 bg-white/70 shadow-[0_18px_50px_rgba(39,91,55,.14)] animate-pulse">
            <img
              src="/mfb-chat-logo.png"
              alt="MFB Chat"
              className="h-full w-full scale-110 object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#183024]">
            MFB Chat
          </h1>

          <div
            className="mt-5 flex items-center gap-1.5"
            aria-label="Yükleniyor"
          >
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" />
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
