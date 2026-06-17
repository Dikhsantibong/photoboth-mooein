"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

type PricingShape = {
  amount_reguler?: number;
  amount_flipbook?: number;
  amount_koran?: number;
  amount_print_reguler?: number;
  amount_print_flipbook?: number;
  amount_print_koran?: number;
};

const defaultPricing: PricingShape = {
  amount_koran: 30000,
  amount_reguler: 12000,
  amount_flipbook: 65000,
  amount_print_koran: 10000,
  amount_print_reguler: 3000,
  amount_print_flipbook: 20000,
};

/** Ringkas untuk label kartu (mis. 35000 → "35K") */
function formatCompactIdr(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const k = Math.round(n / 1000);
  return `${k}K`;
}

/** Ikon versi lama halaman pilih kanvas (grid strip / koran / buku) */
const canvasOptions = [
  {
    id: "reguler",
    displayTitle: "STRIP REGULER",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="2" width="7" height="9" rx="1.5" />
        <rect x="14" y="2" width="7" height="9" rx="1.5" />
        <rect x="3" y="13" width="7" height="9" rx="1.5" />
        <rect x="14" y="13" width="7" height="9" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "flipbook",
    displayTitle: "FLIPBOOK",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <rect x="8" y="6" width="8" height="8" rx="1" />
        <path d="M8 17h8" />
        <path d="M8 19h5" />
      </svg>
    ),
  },
  {
    id: "koran",
    displayTitle: "NEWSPAPER",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="5" y1="10" x2="12" y2="10" />
        <line x1="5" y1="12.5" x2="12" y2="12.5" />
        <line x1="5" y1="15" x2="12" y2="15" />
        <line x1="5" y1="17.5" x2="10" y2="17.5" />
        <rect x="14" y="10" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
];

const defaultEnabled: Record<string, boolean> = {
  koran: true,
  reguler: true,
  flipbook: true,
};

function loadEnabledCanvas(): Record<string, boolean> {
  if (typeof window === "undefined") return defaultEnabled;
  try {
    const raw = localStorage.getItem("enabledCanvas");
    if (!raw) return defaultEnabled;
    return { ...defaultEnabled, ...JSON.parse(raw) };
  } catch {
    return defaultEnabled;
  }
}

function loadPricing(): PricingShape {
  if (typeof window === "undefined") return defaultPricing;
  try {
    const raw = localStorage.getItem("paymentGateway");
    if (!raw) return defaultPricing;
    return { ...defaultPricing, ...JSON.parse(raw) };
  } catch {
    return defaultPricing;
  }
}

function initialSelected(enabled: Record<string, boolean>): string {
  return canvasOptions.find((opt) => enabled[opt.id])?.id ?? "koran";
}

export default function PilihKanvas() {
  const router = useRouter();
  const [enabledCanvas] = useState(loadEnabledCanvas);
  const [selected, setSelected] = useState(() =>
    initialSelected(loadEnabledCanvas()),
  );
  const [pricing] = useState(loadPricing);
  const [customBgImage, setCustomBgImage] = useState<string>("");

  useEffect(() => {
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
  }, []);

  const amountFor = (id: string) => {
    const key = `amount_${id}` as keyof PricingShape;
    return Number(pricing[key]) || 0;
  };

  const visibleOptions = canvasOptions.filter((o) => enabledCanvas[o.id]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col p-6 font-sans lg:p-8" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}

        <header className="relative shrink-0 px-6 pt-10 text-center z-10">
          <h1
            className={`text-[clamp(2rem,8vw,3.5rem)] leading-none tracking-tight text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${poppins.className}`}
          >
            Pilih Canvas
          </h1>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-8 sm:px-6">
          <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-4 sm:gap-5 md:flex-nowrap md:items-stretch">
            {visibleOptions.map((option) => {
              const isSelected = selected === option.id;
              const priceLabel = formatCompactIdr(amountFor(option.id));
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  title={`${option.displayTitle} — ${priceLabel}`}
                  className={[
                    "relative flex w-full min-w-0 flex-col rounded-2xl bg-white border-2 border-black p-6 text-left shadow-lg transition-[outline-color] duration-200 sm:p-8",
                    "aspect-square max-w-[320px] flex-1 sm:max-w-[360px]",
                    isSelected
                      ? "z-1 outline-2 outline-offset-4 outline-black"
                      : "outline-2 outline-offset-4 outline-transparent hover:outline-black/50",
                  ].join(" ")}
                >
                  <div className="flex min-h-0 flex-1 items-center justify-center text-black [&>svg]:h-18 [&>svg]:w-18 sm:[&>svg]:h-20 sm:[&>svg]:w-20">
                    {option.icon}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-black pt-3">
                    <span className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                      {option.displayTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-black sm:text-sm">
                        {priceLabel}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-black"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-6 pb-8 pt-2">
          <Link
            href="/tutorial"
            className="rounded-lg bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            KEMBALI
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/pembayaran?kanvas=${selected}`)}
            className="rounded-lg bg-white px-10 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            LANJUT
          </button>
        </footer>
    </div>
  );
}
