"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export default function Home() {
  const router = useRouter();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customBgImage, setCustomBgImage] = useState<string>("");

  useEffect(() => {
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
  }, []);

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      router.push("/settings");
    }, 1500);
  }, [router]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleMulaiFoto = () => {
    router.push("/tutorial");

    fetch(`/api/payment-gateway`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          localStorage.setItem("paymentGateway", JSON.stringify(data.data));
        }
      })
      .catch(() => { });
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col p-6 font-sans lg:p-8" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}

      {/* Hidden long-press zone — pojok kanan atas → Settings */}
      <div
        className="absolute right-0 top-0 z-50 h-[60px] w-[60px] cursor-default select-none"
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        aria-hidden="true"
      />

      <main className="relative flex flex-1 flex-col items-center justify-center text-center z-10">
          <h1 className={`text-[clamp(3rem,10vw,5rem)] leading-none tracking-tight text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${poppins.className}`}>
            
          </h1>
          <button
            type="button"
            onClick={handleMulaiFoto}
            className="absolute bottom-8 right-8 rounded-lg bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            Mulai
          </button>
        </main>
    </div>
  );
}
