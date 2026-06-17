"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const steps = [
  {
    step: "01",
    title: "Pilih Kategori",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Pilih Metode",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="m9 15 3 3 3-3" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Pembayaran",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "Cek Pembayaran",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    ),
  },
  {
    step: "05",
    title: "Sesi Foto",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    step: "06",
    title: "Edit Foto",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
  {
    step: "07",
    title: "Print & Download",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect width="12" height="8" x="6" y="14" />
        <path d="M10 2v4" />
        <path d="M14 2v4" />
      </svg>
    ),
  },
  {
    step: "08",
    title: "Selesai",
    illustrationIcon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default function Tutorial() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLanjut = useCallback(() => {
    const data = localStorage.getItem("paymentGateway");
    if (data) {
      router.push("/pilih-kanvas");
      return;
    }

    setIsLoading(true);
    const interval = setInterval(() => {
      const check = localStorage.getItem("paymentGateway");
      if (check) {
        clearInterval(interval);
        setIsLoading(false);
        router.push("/pilih-kanvas");
      }
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      setIsLoading(false);
      router.push("/pilih-kanvas");
    }, 10000);
  }, [router]);

  return (
    <div className="relative flex h-dvh w-full flex-col p-4 font-sans sm:p-6 lg:p-8 overflow-hidden">
      {/* Back Button */}
      <Link href="/" className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </div>
      </Link>

      {/* Title */}
      <h1 className={`shrink-0 pt-2 mb-4 text-center text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:text-2xl lg:text-3xl sm:mb-6 ${poppins.className}`}>Tutorial</h1>

        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto px-2 py-2 sm:px-6 sm:py-4">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 landscape:grid-cols-4 sm:gap-4 lg:gap-5 auto-rows-min">
            {steps.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col rounded-xl bg-white p-3 shadow-lg sm:p-4 lg:p-5"
              >
                <div className="absolute left-3 top-3 flex items-center justify-center rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:left-4 sm:top-4 sm:py-1 sm:text-xs">
                  {item.step}
                </div>
                <div className="mt-6 flex flex-1 items-center justify-center py-2 text-gray-400 sm:mt-8 sm:py-3 [&>svg]:h-10 [&>svg]:w-10 sm:[&>svg]:h-14 sm:[&>svg]:w-14 lg:[&>svg]:h-16 lg:[&>svg]:w-16">
                  {item.illustrationIcon}
                </div>
                <h3 className={`shrink-0 text-center text-xs font-bold text-black sm:text-sm lg:text-base ${poppins.className}`}>
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </main>

        {/* Lanjut Button */}
        <div className="shrink-0 flex justify-end px-2 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
          <button
            type="button"
            onClick={handleLanjut}
            disabled={isLoading}
            className="rounded-lg bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
          >
            {isLoading ? "MEMUAT…" : "Lanjut"}
          </button>
        </div>
    </div>
  );
}
