"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Poppins } from "next/font/google";
import dynamic from "next/dynamic";
import "react-simple-keyboard/build/css/index.css";

const Keyboard = dynamic(() => import("react-simple-keyboard"), { ssr: false });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

type PricingData = {
  name?: string;
  server_key?: string;
  client_key?: string;
  merchant_id?: string;
  is_production?: boolean;
  amount_koran?: number;
  amount_reguler?: number;
  amount_flipbook?: number;
  amount_print_koran?: number;
  amount_print_reguler?: number;
  amount_print_flipbook?: number;
  [key: string]: any; // Tambahkan ini agar bisa diakses dengan kunci dinamis
};

const defaultPricingData: PricingData = {
  name: "QRIS",
  is_production: false,
  amount_koran: 30000,
  amount_reguler: 12000,
  amount_flipbook: 65000,
  amount_print_koran: 10000,
  amount_print_reguler: 3000,
  amount_print_flipbook: 20000,
};

// ----------------------------------------------------------------------
// QRIS Modal Component (Dumb Component now)
// ----------------------------------------------------------------------
function QrisModal({
  basePrice,
  canvasType,
  gatewayName,
  onClose,
  qrisState,
  qrisData,
  timeLeft
}: {
  basePrice: number;
  canvasType: string;
  gatewayName: string;
  onClose: () => void;
  qrisState: string;
  qrisData: {
    qr_string?: string | null;
    qr_image_url?: string | null;
    order_id?: string;
    is_iframe?: boolean;
    is_snap?: boolean;
  } | null;
  timeLeft: number;
}) {

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">

      {/* Loading */}
      {qrisState === "loading" && (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-4xl bg-white shadow-2xl">
            <svg className="animate-spin text-orange-600" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Membuat Barcode...</h2>
          <p className="text-white/60 font-medium text-sm mt-2">Menghubungkan ke perbankan</p>
        </div>
      )}

      {/* Error */}
      {qrisState === "error" && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 max-w-sm w-full">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-4xl bg-rose-100 text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{timeLeft <= 0 ? "Waktu Habis" : "Gagal Membuka QR"}</h2>
          <p className="text-slate-500 font-medium text-sm mb-8">Sistem pembayaran mengalami gangguan, silakan coba lagi nanti.</p>
          <button onClick={onClose} className="px-8 py-3.5 rounded-full font-bold text-white bg-slate-800 hover:bg-slate-700 w-full transition-colors">
            KEMBALI
          </button>
        </div>
      )}

      {/* Ready / Success */}
      {(qrisState === "ready" || qrisState === "success") && (
        <div
          className={`relative flex w-full animate-in flex-col items-center overflow-hidden rounded-[3rem] bg-white p-8 pb-10 shadow-2xl duration-700 zoom-in-95 ${qrisData?.is_iframe ? "max-w-lg" : "max-w-sm"}`}
        >

          {!qrisData?.is_iframe && (
            <>
              <div className="mb-6 flex w-full items-center justify-center gap-2 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                <span className="text-sm font-black uppercase tracking-widest">{gatewayName}</span>
              </div>

              <div className="mb-6 flex flex-col items-center">
                <span className="text-4xl font-black text-slate-800">{formatPrice(basePrice)}</span>
              </div>
            </>
          )}

          <div
            className={`relative flex items-center justify-center rounded-3xl border-2 border-slate-100 bg-slate-50 shadow-sm transition-all duration-700 ${qrisData?.is_iframe ? "h-[min(72vh,560px)] w-full p-0" : "h-64 w-64 p-4"} ${qrisState === "success" ? "absolute scale-0 opacity-0" : "scale-100 opacity-100"}`}
          >
            {qrisData?.is_iframe && qrisData?.qr_image_url ? (
              <iframe
                src={qrisData.qr_image_url}
                title="Pembayaran Midtrans Snap"
                className="h-full w-full rounded-2xl border-0 bg-white"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
              />
            ) : qrisData?.qr_string ? (
              /* Prioritaskan Render Lokal dari String (Lebih Stabil) */
              <div className="bg-white p-2 rounded-xl">
                <QRCode value={qrisData.qr_string} size={200} bgColor={"transparent"} fgColor={"#1e293b"} level={"H"} />
              </div>
            ) : qrisData?.qr_image_url ? (
              /* Fallback ke Image URL milik Midtrans */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrisData.qr_image_url}
                alt="QRIS Payment"
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <QRCode value={"MOCK_QR"} size={200} bgColor={"transparent"} fgColor={"#1e293b"} level={"H"} />
            )}
          </div>

          {/* Success Overlay Animation */}
          <div className={`flex flex-col items-center absolute inset-0 bg-white/95 backdrop-blur z-10 justify-center transition-all duration-700 delay-300 ${qrisState === 'success' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl animate-bounce mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800">Pembayaran Berhasil!</h2>
          </div>

          {qrisState !== "success" && (
            <div className="mt-8 flex flex-col items-center w-full">
              <div className="text-center mb-8 px-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Sisa Waktu</p>
                <p className="text-2xl font-extrabold text-rose-500 leading-none tabular-nums">
                  {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </p>
              </div>
              <button onClick={onClose} className="px-8 py-3 rounded-full font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors w-full">
                BATAL & KEMBALI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Main Page component
// ----------------------------------------------------------------------
function PembayaranContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasType = searchParams.get("kanvas") || "koran";

  const [pricingData, setPricingData] = useState<PricingData>(defaultPricingData);
  const [voucherCode, setVoucherCode] = useState("");
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [showVoucherKeyboard, setShowVoucherKeyboard] = useState(false);
  const [appliedVoucherId, setAppliedVoucherId] = useState<number | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [enableQris, setEnableQris] = useState<boolean>(true);
  const keyboardRef = useRef<any>(null);
  const [customBgImage, setCustomBgImage] = useState<string>("");

  useEffect(() => {
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
  }, []);

  useEffect(() => {
    const savedQris = localStorage.getItem("enableQris");
    if (savedQris !== null) setEnableQris(savedQris === "true");
  }, []);

  // Background QRIS states
  const [qrisState, setQrisState] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [qrisData, setQrisData] = useState<{
    qr_string?: string | null;
    qr_image_url?: string | null;
    order_id: string;
    is_iframe?: boolean;
    is_snap?: boolean;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timeout default
  useEffect(() => {
    const savedTimeout = localStorage.getItem("sessionTimeout");
    if (savedTimeout) setTimeLeft(parseInt(savedTimeout, 10));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("paymentGateway");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Handle nested "data" property if present in localStorage
        const pricing = parsed.data || parsed;
        setPricingData((prev) => ({ ...prev, ...pricing }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const originalPrice = pricingData ? pricingData[`amount_${canvasType}`] || 0 : 0;
  const basePrice = Math.max(0, originalPrice - (originalPrice * (discountPercentage / 100)));
  const gatewayName = pricingData?.name || "QRIS";

  // ── Helper: Start New Session Timer ──
  const startNewSession = () => {
    const savedTimeout = localStorage.getItem("sessionTimeout");
    const timeoutSeconds = savedTimeout ? parseInt(savedTimeout, 10) : 300;
    const expiryTime = Date.now() + timeoutSeconds * 1000;
    localStorage.setItem("session_expiry", expiryTime.toString());
    console.log(`[Session Started] Timer reset to ${timeoutSeconds} seconds`);
  };

  // ── Helper: Create Transaction on Backend ──
  const createTransaction = async (paymentType: "qris" | "voucher", voucherId?: number | null): Promise<number | null> => {
    try {
      const prefix = localStorage.getItem("orderPrefix") || "MOOEIN";
      const txId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const response = await fetch(`/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: txId,
          amount: basePrice,
          payment_type: paymentType,
          voucher_id: voucherId || null,
          status: "PAID",
        }),
      });
      const result = await response.json();

      if (result.success && result.data) {
        // Simpan ke localStorage agar halaman print bisa pakai
        localStorage.setItem("transactionDbId", result.data.id.toString());
        localStorage.setItem("transactionId", result.data.transaction_id);
        console.log("[Transaction Created]", result.data);
        return result.data.id;
      } else {
        console.error("Transaction creation failed:", result);
        return null;
      }
    } catch (error) {
      console.error("Transaction creation error:", error);
      return null;
    }
  };

  // 1. Generate QRIS Immediately on Background Mount
  useEffect(() => {
    if (basePrice <= 0 || !enableQris) return;

    let mounted = true;
    const generateQris = async () => {
      // Pastikan pricingData telah ter-load sebelum request jalan
      if (!pricingData || !pricingData.server_key) return;

      try {
        const prefix = localStorage.getItem("orderPrefix") || "MOOEIN";
        const response = await fetch(`/api/generate-qris`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: basePrice,
            canvas_type: canvasType,
            gateway_name: pricingData.name, // "Midtrans" atau "Doku"
            server_key: pricingData.server_key,
            client_key: pricingData.client_key,
            is_production: pricingData.is_production === true,
            order_prefix: prefix,
          })
        });
        const result = await response.json();

        if (mounted) {
          if (
            result.success &&
            result.data?.order_id &&
            (Boolean(result.data.qr_string) ||
              result.data.is_snap === true ||
              Boolean(result.data.qr_image_url))
          ) {
            setQrisData(result.data);
            setQrisState("ready");
          } else {
            setQrisState("error");
          }
        }
      } catch (error) {
        console.error("Error generating QRIS:", error);
        if (mounted) setQrisState("error");
      }
    };

    generateQris();

    return () => {
      mounted = false;
    };
  }, [basePrice, canvasType, pricingData?.server_key]);

  // 2. Poll Status on Background if QRIS is Ready
  useEffect(() => {
    if (qrisState !== "ready" || !qrisData?.order_id || !pricingData?.server_key) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/check-status?order_id=${encodeURIComponent(qrisData.order_id)}&server_key=${encodeURIComponent(pricingData.server_key!)}&is_production=${pricingData.is_production === true ? "1" : "0"}`,
        );
        const result = await response.json();

        if (result.success && result.data?.status === "paid") {
          setQrisState("success");
          clearInterval(interval);

          // Auto open modal if paid while closed? Open it just to show success!
          setIsQrisModalOpen(true);

          // Buat transaksi di backend saat pembayaran QRIS berhasil
          await createTransaction("qris", appliedVoucherId);

          // Reset Timer Sesi Baru
          startNewSession();

          // Fetch templates sekaligus saat pembayaran sukses
          await fetchAndStoreTemplates();

          setTimeout(() => {
            router.push("/template?kanvas=" + canvasType);
          }, 2000);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [qrisState, qrisData, router, pricingData?.server_key, canvasType]);

  // 3. Background Countdown
  useEffect(() => {
    if (qrisState !== "ready") return;
    if (timeLeft <= 0) {
      setQrisState("error");
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [qrisState, timeLeft]);

  // Formatting & UI Utils
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCanvasName = (type: string) => {
    const map: Record<string, string> = {
      reguler: "STRIP REGULER",
      koran: "NEWSPAPER",
      flipbook: "FLIPBOOK",
    };
    return map[type] || "KANVAS";
  };

  const handleVoucherInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setVoucherCode(value);
    setVoucherError(null);
    if (keyboardRef.current) {
      keyboardRef.current.setInput(value);
    }
  };

  const onVoucherKeyboardChange = (input: string) => {
    const value = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setVoucherCode(value);
    setVoucherError(null);
    if (keyboardRef.current) {
      keyboardRef.current.setInput(value);
    }
  };

  // Fungsi untuk fetch templates & stickers dan simpan ke localStorage
  const fetchAndStoreTemplates = async () => {
    try {
      const [resTemplates, resStickers] = await Promise.all([
        fetch(`/api/templates?type=${canvasType}`),
        fetch(`/api/stickers`)
      ]);
      
      const resultTemplates = await resTemplates.json();
      if (resultTemplates.success) {
        localStorage.setItem("templates", JSON.stringify(resultTemplates.data));
        localStorage.setItem("templates_base_url", resultTemplates.base_url || "");
      }

      const resultStickers = await resStickers.json();
      if (resultStickers.success) {
        localStorage.setItem("stickers", JSON.stringify(resultStickers.data));
      }
    } catch (e) {
      console.error("Failed to prefetch templates or stickers:", e);
    }
  };

  const handleVoucherSubmit = async () => {
    if (voucherCode.length < 8) return;
    setIsVerifyingVoucher(true);
    setVoucherError(null);

    try {
      const response = await fetch(`/api/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode, type: canvasType })
      });
      const result = await response.json();
      console.log("[Voucher Response]", result);

      if (response.ok && result.valid) {
        // Ambil voucher_id dari response backend (result.data.voucher_id)
        const voucherId = result.data?.voucher_id || null;
        const discount = result.data?.discount_percentage ?? 100;

        if (discount === 100) {
          // Diskon 100% (Gratis)
          // Temporarily set basePrice to 0 by setting discountPercentage to 100
          setDiscountPercentage(100);
          setAppliedVoucherId(voucherId);
          await createTransaction("voucher", voucherId);
          startNewSession();
          await fetchAndStoreTemplates();
          setIsVoucherModalOpen(false);
          router.push("/template?kanvas=" + canvasType);
        } else {
          // Diskon sebagian (misal 50%)
          setDiscountPercentage(discount);
          setAppliedVoucherId(voucherId);
          setIsVoucherModalOpen(false);
          setIsQrisModalOpen(true); // Buka QRIS untuk sisa pembayaran
        }
      } else {
        setVoucherError(result.message || "Kode voucher tidak valid!");
      }
    } catch (error) {
      setVoucherError("Gagal menghubungi server.");
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const qrisIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-24 w-24 sm:h-28 sm:w-28"
      aria-hidden
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );

  const voucherIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-24 w-24 sm:h-28 sm:w-28"
      aria-hidden
    >
      <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" />
      <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z" />
    </svg>
  );

  return (
    <div className="relative flex h-dvh w-full flex-col p-4 font-sans sm:p-6 lg:p-8 overflow-hidden" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}
        <header className="relative shrink-0 px-4 pt-6 text-center z-10 sm:px-6 sm:pt-10">
          <h1
            className={`text-[clamp(1.5rem,6vw,3.5rem)] leading-none tracking-tight text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${poppins.className}`}
          >
            Metode Pembayaran
          </h1>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto mb-8 flex w-full max-w-md items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-md sm:px-6">
            <div className="shrink-0 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {getCanvasName(canvasType)}
              </p>
              <div className="flex items-center gap-2">
                {discountPercentage > 0 && (
                  <p className="text-sm font-bold text-slate-400 line-through">
                    {formatPrice(originalPrice)}
                  </p>
                )}
                <p className="text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                  {formatPrice(basePrice)}
                </p>
              </div>
              {discountPercentage > 0 && (
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  Diskon {discountPercentage}% Terpakai
                </p>
              )}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 sm:gap-5 landscape:flex-row landscape:items-stretch">
            {enableQris && (
            <button
              type="button"
              onClick={() => setIsQrisModalOpen(true)}
              className="relative flex w-full min-w-0 flex-col rounded-2xl bg-white border-2 border-black p-5 text-left shadow-lg transition-[outline-color] duration-200 sm:p-8 landscape:aspect-square landscape:max-w-none landscape:flex-1 max-w-[400px] outline-2 outline-offset-4 outline-transparent hover:outline-black/50"
            >
              <div className="flex min-h-0 flex-1 items-center justify-center text-black">
                {qrisIcon}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-black pt-3">
                <span className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                  Bayar pakai QRIS
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
            </button>
            )}

            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(true)}
              className="relative flex w-full min-w-0 flex-col rounded-2xl bg-white border-2 border-black p-5 text-left shadow-lg transition-[outline-color] duration-200 sm:p-8 landscape:aspect-square landscape:max-w-none landscape:flex-1 max-w-[400px] outline-2 outline-offset-4 outline-transparent hover:outline-black/50"
            >
              <div className="flex min-h-0 flex-1 items-center justify-center text-black">
                {voucherIcon}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-black pt-3">
                <span className="text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                  Gunakan voucher
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
            </button>
          </div>
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-6 pb-8 pt-2">
          <Link
            href="/pilih-kanvas"
            className="rounded-lg bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            KEMBALI
          </Link>
        </footer>

      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/50 p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm animate-in zoom-in-95 rounded-3xl bg-white p-8 shadow-2xl duration-300">
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/15 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" />
                  <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">Kode voucher</h3>
              <p className="mt-2 px-2 text-center text-sm font-medium text-slate-500">
                Masukkan 8 digit kode promo paket foto Anda.
              </p>
            </div>
            <input
              type="text"
              maxLength={8}
              value={voucherCode}
              onFocus={() => {
                setShowVoucherKeyboard(true);
                if (keyboardRef.current) keyboardRef.current.setInput(voucherCode);
              }}
              onChange={handleVoucherInput}
              placeholder="XXXXXXXX"
              className={`mb-2 w-full rounded-2xl border-2 bg-slate-50 px-6 py-4 text-center text-3xl font-black uppercase tracking-[0.25em] text-slate-800 placeholder:text-slate-300 transition-all focus:outline-none focus:ring-4 ${voucherError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "border-blue-600/20 focus:border-blue-600 focus:ring-blue-600/20"}`}
            />
            <div className="mb-4 flex h-6 w-full items-center justify-center">
              {voucherError && (
                <p className="flex animate-in slide-in-from-top-2 items-center gap-1.5 text-sm font-bold text-rose-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  {voucherError}
                </p>
              )}
            </div>
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                onClick={() => { setIsVoucherModalOpen(false); setShowVoucherKeyboard(false); }}
                className="flex-1 rounded-full py-3.5 font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleVoucherSubmit}
                disabled={voucherCode.length < 8 || isVerifyingVoucher}
                className="flex flex-1 items-center justify-center rounded-full bg-blue-600 py-3.5 font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isVerifyingVoucher ? (
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  "TERAPKAN"
                )}
              </button>
            </div>
          </div>

          {/* Virtual Keyboard for Voucher */}
          <div 
            className={`w-full max-w-2xl mt-4 bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
              showVoucherKeyboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="flex justify-between items-center px-6 py-2 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Virtual Keyboard</span>
              <button 
                onClick={() => setShowVoucherKeyboard(false)}
                className="px-4 py-1.5 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-colors text-xs uppercase"
              >
                Tutup
              </button>
            </div>
            <div className="p-4 text-black">
              <Keyboard
                keyboardRef={r => (keyboardRef.current = r)}
                layoutName="default"
                onChange={onVoucherKeyboardChange}
                theme="hg-theme-default"
                layout={{
                  default: [
                    "1 2 3 4 5 6 7 8 9 0",
                    "Q W E R T Y U I O P",
                    "A S D F G H J K L",
                    "Z X C V B N M {bksp}"
                  ]
                }}
                display={{ "{bksp}": "⌫" }}
              />
            </div>
          </div>
        </div>
      )}

      {isQrisModalOpen && (
        <QrisModal
          basePrice={basePrice}
          canvasType={canvasType}
          gatewayName={gatewayName}
          onClose={() => setIsQrisModalOpen(false)}
          qrisState={qrisState}
          qrisData={qrisData}
          timeLeft={timeLeft}
        />
      )}
    </div>
  );
}

export default function Pembayaran() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh w-full items-center justify-center">
          <svg
            className="animate-spin text-black"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      }
    >
      <PembayaranContent />
    </Suspense>
  );
}
