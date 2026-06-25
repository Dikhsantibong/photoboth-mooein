"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import localforage from "localforage";
import { Poppins } from "next/font/google";

import dynamic from "next/dynamic";
import "react-simple-keyboard/build/css/index.css";

const Keyboard = dynamic(() => import("react-simple-keyboard"), { ssr: false });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

// ── Helpers ──────────────────────────────────────────────
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Types ──────────────────────────────────────────────
type UploadStage = "idle" | "uploading" | "success" | "error";

type QrisChargeData = {
  qr_string?: string | null;
  qr_image_url?: string | null;
  order_id?: string;
  is_iframe?: boolean;
  is_snap?: boolean;
  snap_token?: string;
};

type PaymentGatewayPayload = Record<string, string | number | boolean | undefined> & {
  name?: string;
  server_key?: string;
};

function amountPrintForCanvas(
  pg: PaymentGatewayPayload | null,
  canvasType: string
): number {
  if (!pg) return 0;
  const v = pg[`amount_print_${canvasType}`];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ── QRIS Payment Modal ───────────────────────────────────
function QrisModal({
  basePrice,
  gatewayName,
  onClose,
  qrisState,
  qrisData,
  timeLeft
}: {
  basePrice: number;
  gatewayName: string;
  onClose: () => void;
  qrisState: string;
  qrisData: QrisChargeData | null;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-full animate-in zoom-in-95 duration-500 border-[8px] border-black transition-all ${qrisData?.is_iframe ? "max-w-2xl" : "max-w-md"}`}>
        <h2 className={`${poppins.className} text-black text-xl mb-6 uppercase tracking-widest font-bold`}>TAMBAH CETAK</h2>
        
        {qrisState === "loading" && (
          <div className="flex flex-col items-center py-10">
            <div className="w-16 h-16 border-8 border-gray-100 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-slate-400">Membuat Barcode...</p>
          </div>
        )}

        {qrisState === "error" && (
           <div className="text-center py-6">
              <p className="text-rose-500 font-bold mb-6">Gagal memuat sistem pembayaran.</p>
              <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-100 font-bold text-slate-500">TUTUP</button>
           </div>
        )}

        {(qrisState === "ready" || qrisState === "success") && (
          <div
            className={`relative flex w-full animate-in flex-col items-center overflow-hidden transition-all duration-700`}
          >
            {!qrisData?.is_iframe && (
              <>
                <div className="text-center mb-6">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest leading-none mb-1">TOTAL BAYAR</p>
                  <p className="text-3xl font-black text-slate-800">{formatPrice(basePrice)}</p>
                </div>
              </>
            )}

            <div className={`relative flex items-center justify-center rounded-[2rem] border-2 border-slate-100 bg-slate-50 shadow-sm transition-all duration-700 ${qrisData?.is_iframe ? "h-[min(72vh,560px)] w-full p-0" : "h-64 w-64 p-4"} ${qrisState === "success" ? "absolute scale-0 opacity-0" : "scale-100 opacity-100"}`}>
              {qrisData?.is_iframe && qrisData?.qr_image_url ? (
                <iframe
                  src={qrisData.qr_image_url}
                  title="Pembayaran"
                  className="h-full w-full rounded-2xl border-0 bg-white"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
                />
              ) : qrisData?.qr_string ? (
                <div className="bg-white p-2 rounded-xl">
                  <QRCode value={qrisData.qr_string} size={200} bgColor={"transparent"} fgColor={"#1e293b"} level={"H"} />
                </div>
              ) : qrisData?.qr_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrisData.qr_image_url} alt="QRIS" className="h-full w-full object-contain mix-blend-multiply" />
              ) : (
                <QRCode value={"MOCK"} size={200} />
              )}
            </div>

            {qrisState === 'success' && (
              <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <span className="font-black text-emerald-600 uppercase">BERHASIL!</span>
              </div>
            )}

            {qrisState !== "success" && (
              <div className="text-center mt-6 mb-8 w-full">
                <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">BATAS WAKTU BAYAR</p>
                <p className="text-xl font-black text-black tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</p>
              </div>
            )}
          </div>
        )}

        {(qrisState === "ready" || qrisState === "success") && (
          <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors">BATAL</button>
        )}
      </div>
    </div>
  );
}

// ── Main Print Content ───────────────────────────────────
function PrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasType = searchParams.get("kanvas") || "reguler";
  const templateId = searchParams.get("template") || "1";

  // Data States
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PaymentGatewayPayload | null>(null);
  const [downloadToken] = useState(() => generateToken());

  // UI States
  const [previewMode, setPreviewMode] = useState<"photo" | "live" | "gif">("photo");
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [finalImageDbId, setFinalImageDbId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [selectedPrintSize, setSelectedPrintSize] = useState<"4R" | "2R">("4R");
  const [printCopies, setPrintCopies] = useState(1);
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [currentGifIndex, setCurrentGifIndex] = useState(0);
  const [templateCategory, setTemplateCategory] = useState<string>("");

  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [qrisState, setQrisState] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [qrisData, setQrisData] = useState<QrisChargeData | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [pendingPrintQty, setPendingPrintQty] = useState(1);
  const [pendingPrintAmount, setPendingPrintAmount] = useState(0);
  const [enableQris, setEnableQris] = useState<boolean>(true);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [showVoucherKeyboard, setShowVoucherKeyboard] = useState(false);
  const keyboardRef = useRef<any>(null);

  useEffect(() => {
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
  }, []);

  const uploadStarted = useRef(false);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const uploadPromiseRef = useRef<Promise<number | null> | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState<number | null>(null);
  const autoRedirectRef = useRef<NodeJS.Timeout | null>(null);
  const [customBgImage, setCustomBgImage] = useState<string>("");

  // ── Load Data ──────────────────────────
  useEffect(() => {
    const savedQris = localStorage.getItem("enableQris");
    if (savedQris !== null) setEnableQris(savedQris === "true");

    const loadData = async () => {
      const img = localStorage.getItem("finalRenderImage");
      const pricingRaw = localStorage.getItem("paymentGateway");
      setFinalImage(img);
      if (pricingRaw) setPricing(JSON.parse(pricingRaw));

      const videoBlob = await localforage.getItem<Blob>("finalLiveVideo");
      if (videoBlob) {
        setFinalVideoUrl(URL.createObjectURL(videoBlob));
      }

      const gifBlob = await localforage.getItem<Blob>("finalGifVideo");

      const raw = localStorage.getItem("capturedPhotos") || localStorage.getItem("rawPhotos");
      if (raw) setRawPhotos(JSON.parse(raw));

      // Read template category
      const templatesRaw = localStorage.getItem("templates");
      if (templatesRaw) {
        try {
          const templates = JSON.parse(templatesRaw);
          const tpl = templates.find((t: any) => t.id?.toString() === templateId);
          if (tpl?.category) setTemplateCategory(tpl.category);
        } catch (e) { /* ignore */ }
      }
    };
    loadData();
    localStorage.removeItem("session_expiry");
  }, []);

  // ── Helper: Save All Files Locally ─────
  const saveAllFilesLocally = async () => {
    try {
      const storedFinal = localStorage.getItem("finalRenderImage");
      const storedTx = localStorage.getItem("transactionDbId");
      if (!storedFinal || !storedTx) return;

      const capturedPhotosRaw = localStorage.getItem("capturedPhotos");
      const rawPhotosRaw = localStorage.getItem("rawPhotos");
      const videoBlob = await localforage.getItem<Blob>("finalLiveVideo");
      const gifBlob = await localforage.getItem<Blob>("finalGifVideo");

      const payload: any = {
        transaction_id: storedTx,
        template_id: templateId,
        finalImageBase64: storedFinal,
        rawPhotos: JSON.parse(rawPhotosRaw || "[]"),
        capturedPhotos: JSON.parse(capturedPhotosRaw || "[]"),
        videoBlob: videoBlob,
        gifBlob: gifBlob
      };

      // Convert video blob to base64 for the API
      if (videoBlob) {
        try {
          const arrayBuffer = videoBlob.arrayBuffer();
          const uint8 = new Uint8Array(await arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const b64 = btoa(binary);
          const mimeType = videoBlob.type || 'video/webm';
          payload.videoBase64 = `data:${mimeType};base64,${b64}`;
        } catch (vidErr) {
          console.warn('[Print] Gagal mengkonversi video ke base64 untuk backup lokal:', vidErr);
        }
      }

      await fetch(`/api/save-failed-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[Print] Semua file backup lokal disimpan untuk transaksi: ${storedTx}`);
    } catch (err) {
      console.error('[Print] Gagal menyimpan backup lokal lengkap:', err);
    }
  };

  // ── Background Upload ─────────────────
  const performUpload = useCallback(async () => {
    if (uploadStarted.current) return uploadPromiseRef.current;
    uploadStarted.current = true;

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const uploadTask = (async () => {
      try {
        const storedFinalImage = localStorage.getItem("finalRenderImage");
        const storedTxDbId = localStorage.getItem("transactionDbId");
        if (!storedFinalImage || !storedTxDbId) return null;

        setUploadStage("uploading");
        setUploadProgress(0);
        const dbTxId = parseInt(storedTxDbId);

        const formData = new FormData();
        formData.append("transaction_id", dbTxId.toString());
        formData.append("template_id", templateId);
        formData.append("token_final_image", downloadToken);
        formData.append("image", dataUrlToBlob(storedFinalImage), "final.jpg");

        // ── Tambahkan Foto-Foto Per Frame ──
        const capturedPhotosRaw = localStorage.getItem("capturedPhotos");
        const rawPhotosRaw = localStorage.getItem("rawPhotos");
        const templatesRaw = localStorage.getItem("templates");
        
        const capturedPhotos = JSON.parse(capturedPhotosRaw || "[]");
        const rawPhotos = JSON.parse(rawPhotosRaw || "[]");
        const templates = JSON.parse(templatesRaw || "[]");
        
        const photosToSend = capturedPhotos.length > 0 ? capturedPhotos : rawPhotos;
        const template = templates.find((t: any) => t.id.toString() === templateId);
        const frames = template?.frames || [];

        photosToSend.forEach((photo: string, index: number) => {
          if (photo && frames[index]) {
            const photoBlob = dataUrlToBlob(photo);
            formData.append(`photos[${index}][image]`, photoBlob, `photo_${index}.jpg`);
            formData.append(`photos[${index}][frame_id]`, frames[index].id.toString());
          }
        });

        if (abortController.signal.aborted) throw new Error("Aborted beforehand");

        // ── Tambahkan Video Live (converted to MP4 for iOS/Android compatibility) ──
        const finalVideoBlob = await localforage.getItem<Blob>("finalLiveVideo");
        if (finalVideoBlob && finalVideoBlob.size > 0) {
          let videoToUpload: Blob = finalVideoBlob;
          if (finalVideoBlob.type.includes("webm") || !finalVideoBlob.type.includes("mp4")) {
            try {
              const convertForm = new FormData();
              convertForm.append("video", finalVideoBlob, "input.webm");
              const convertRes = await fetch(`/api/convert-video`, {
                method: "POST", body: convertForm, signal: abortController.signal
              });
              if (convertRes.ok && convertRes.headers.get("X-Conversion-Success") === "true") {
                const mp4ArrayBuffer = await convertRes.arrayBuffer();
                videoToUpload = new Blob([mp4ArrayBuffer], { type: "video/mp4" });
              } else {
                videoToUpload = new Blob([finalVideoBlob], { type: "video/mp4" });
              }
            } catch (convErr) {
              videoToUpload = new Blob([finalVideoBlob], { type: "video/mp4" });
            }
          }
          formData.append("video", videoToUpload, "final.mp4");
        }

        const finalGifBlob = await localforage.getItem<Blob>("finalGifVideo");
        if (finalGifBlob && finalGifBlob.size > 0) {
          let gifToUpload: Blob = finalGifBlob;
          if (finalGifBlob.type.includes("webm") || !finalGifBlob.type.includes("mp4")) {
            try {
              const convertForm = new FormData();
              convertForm.append("video", finalGifBlob, "input.webm");
              const convertRes = await fetch(`/api/convert-video`, {
                method: "POST", body: convertForm, signal: abortController.signal
              });
              if (convertRes.ok && convertRes.headers.get("X-Conversion-Success") === "true") {
                const mp4ArrayBuffer = await convertRes.arrayBuffer();
                gifToUpload = new Blob([mp4ArrayBuffer], { type: "video/mp4" });
              } else {
                gifToUpload = new Blob([finalGifBlob], { type: "video/mp4" });
              }
            } catch (convErr) {
              gifToUpload = new Blob([finalGifBlob], { type: "video/mp4" });
            }
          }
          formData.append("gif_video", gifToUpload, "final.mp4");
        }

        if (abortController.signal.aborted) throw new Error("Aborted before XHR");

        // Use XMLHttpRequest for upload progress tracking
        const { data, status } = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrRef.current = xhr;
          xhr.open("POST", "/api/final-images");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            try { resolve({ data: JSON.parse(xhr.responseText), status: xhr.status }); }
            catch { reject(new Error("Invalid response")); }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.onabort = () => reject(new Error("Upload aborted forcefully"));
          xhr.send(formData);
        });

        if (data.success || status === 200 || status === 201) {
          setFinalImageDbId(data?.data?.id || 0);
          setUploadStage("success");
          setUploadProgress(100);

          // Tetap simpan backup lokal lengkap walaupun upload berhasil (tidak mengganggu alur utama)
          try {
            await saveAllFilesLocally();
          } catch (localErr) {
            console.error('[Print] Backup lokal gagal setelah upload berhasil (tidak masalah):', localErr);
          }

          return data?.data?.id || null;
        }
        
        throw new Error("Upload response not success");
      } catch (e) {
        setUploadStage("error");
        await handleOfflineFallback();
        return null;
      }
    })();
    uploadPromiseRef.current = uploadTask;
    return uploadTask;
  }, [templateId, downloadToken]);

  const handleOfflineFallback = async () => {
    try {
      const storedFinalImage = localStorage.getItem("finalRenderImage");
      const storedTxDbId = localStorage.getItem("transactionDbId");
      if (!storedFinalImage || !storedTxDbId) return;

      const capturedPhotosRaw = localStorage.getItem("capturedPhotos");
      const rawPhotosRaw = localStorage.getItem("rawPhotos");
      const templatesRaw = localStorage.getItem("templates");
      
      const capturedPhotos = JSON.parse(capturedPhotosRaw || "[]");
      const rawPhotos = JSON.parse(rawPhotosRaw || "[]");
      const templates = JSON.parse(templatesRaw || "[]");
      const photosToSend = capturedPhotos.length > 0 ? capturedPhotos : rawPhotos;
      const template = templates.find((t: any) => t.id.toString() === templateId);
      const frames = template?.frames || [];

      const payloadPhotos = photosToSend.map((photo: string, index: number) => {
         return { imageBase64: photo, frame_id: frames[index]?.id?.toString() }
      }).filter((p: any) => p.imageBase64 && p.frame_id);

      const finalVideoBlob = await localforage.getItem<Blob>("finalLiveVideo");
      const finalGifBlob = await localforage.getItem<Blob>("finalGifVideo");

      const queueId = "offline_upload_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      const queueData = {
        id: queueId,
        transaction_id: storedTxDbId,
        template_id: templateId,
        token_final_image: downloadToken,
        finalImageBase64: storedFinalImage,
        photos: payloadPhotos,
        videoBlob: finalVideoBlob || null,
        gifBlob: finalGifBlob || null,
        timestamp: Date.now()
      };

      await localforage.setItem(queueId, queueData);
      
      const existingKeys = await localforage.getItem<string[]>("offline_upload_keys") || [];
      if (!existingKeys.includes(queueId)) {
         existingKeys.push(queueId);
         await localforage.setItem("offline_upload_keys", existingKeys);
      }
      console.log("[Print] Disimpan ke Offline Upload Queue:", queueId);

      // Langsung simpan semua file ke komputer lokal (tidak mengganggu antrian jika gagal)
      try {
        await saveAllFilesLocally();
      } catch (localSaveErr) {
        console.error('[Print] Backup lokal gagal, tapi antrian tetap aman:', localSaveErr);
      }
    } catch(err) {
      console.error("[Print] Gagal nge-save Offline Queue", err);
    }
  };

  useEffect(() => {
    if (finalImage && !uploadStarted.current) performUpload();
  }, [finalImage, performUpload]);

  // ── Print Logic ──────────────────────
  const handlePrint = async (isExtra = false, customQty?: number, customSize?: string, isAutoPrint = false) => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      let dbId = finalImageDbId;
      if (!dbId && uploadPromiseRef.current) {
        // Try to get dbId but don't wait forever — use 0 as fallback for local-only print
        dbId = await Promise.race([
          uploadPromiseRef.current,
          new Promise<null>(r => setTimeout(() => r(null), 500))
        ]);
      }

      const standardPrinter = localStorage.getItem("preferredPrinterName") || "";
      const splitPrinter = localStorage.getItem("preferredPrinterSplitName") || "";
      const orientation = localStorage.getItem("printerOrientation") || "landscape";
      
      const printSize = customSize || selectedPrintSize;
      let targetPrinter = standardPrinter;
      if (printSize === "2R") {
          targetPrinter = splitPrinter || standardPrinter;
      }

      const rawPrintPrice = amountPrintForCanvas(pricing, canvasType);
      const finalPrice = isExtra ? Math.round(Number(rawPrintPrice)) : 0;
      const targetQty = customQty || printCopies;
      const finalImageData = localStorage.getItem("finalRenderImage");
      
      // Validasi: pastikan gambar final tidak kosong/hitam (data URL yang sangat kecil = gambar hitam)
      if (!finalImageData || finalImageData.length < 5000) {
        console.error("finalRenderImage terlalu kecil atau kosong, kemungkinan gambar hitam. Length:", finalImageData?.length);
        if (!isAutoPrint) alert("Gambar hasil render tidak valid. Silakan ulangi sesi foto.");
        return;
      }

      const response = await fetch(`/api/final-images/${dbId || 0}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_print: finalPrice,
          print_quantity: isExtra ? targetQty : 1,
          printer_name: targetPrinter,
          printer_orientation: orientation,
          image_data: finalImageData,
          copies: isExtra ? targetQty : 1,
          print_size: printSize
        }),
      });
      const data = await response.json();
      if (data.success) {
        if (!isExtra) setHasPrinted(true);
        if (!isAutoPrint) alert("Selesai! Foto Anda sedang dicetak.");
      } else {
        if (!isAutoPrint) alert("Gagal mencetak: " + (data.message || "Pastikan printer online."));
      }
    } catch (e) {
      if (!isAutoPrint) alert("Terjadi kesalahan sistem saat mencoba mencetak.");
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    const doAutoPrint = async () => {
      const storedTxId = localStorage.getItem("transactionDbId");
      if (!storedTxId) return;
      
      const autoPrintedKey = `auto_printed_${storedTxId}`;
      if (!localStorage.getItem(autoPrintedKey)) {
        localStorage.setItem(autoPrintedKey, "1");
        
        let cat = templateCategory.toUpperCase();
        if (!cat) {
          const templatesRaw = localStorage.getItem("templates");
          if (templatesRaw) {
             try {
               const templates = JSON.parse(templatesRaw);
               const tpl = templates.find((t: any) => t.id?.toString() === templateId);
               if (tpl?.category) cat = tpl.category.toUpperCase();
             } catch (e) {}
          }
        }

        let printSize: "4R" | "2R" = "4R";
        if (cat === "REGULER") printSize = "2R";
        else if (cat === "REGULER-NOSTRIP") printSize = "4R";
        else if (canvasType === "flipbook") printSize = "2R";
        
        setSelectedPrintSize(printSize);
        await handlePrint(false, 1, printSize, true);
      } else {
        setHasPrinted(true);
      }
    };
    
    if (finalImage) {
      doAutoPrint();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalImage, canvasType, templateId, templateCategory]);

  const handleMainPrintAction = (size: "4R" | "2R") => {
    setSelectedPrintSize(size);
    
    // Jika belum pernah cetak sama sekali dan milih 1 lembar -> Gratis
    if (!hasPrinted && printCopies === 1) {
        handlePrint(false, 1, size);
    } else {
        // Jika sudah pernah cetak, ATAU milih lebih dari 1 lembar -> Bayar
        // Bayar untuk jumlah lembar yang dipilih (dikurangi 1 jika belum pernah cetak)
        const unitPrice = amountPrintForCanvas(pricing, canvasType);
        const qtyToPay = hasPrinted ? printCopies : (printCopies - 1);
        
        if (qtyToPay > 0) {
            setPendingPrintQty(printCopies);
            setPendingPrintAmount(unitPrice * qtyToPay);
            setIsPaymentMethodModalOpen(true);
        } else {
            // Fallback: This shouldn't normally happen if logic is correct
            handlePrint(false, 1, size);
        }
    }
  };

  const handleVoucherInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setVoucherCode(value);
    setVoucherError(null);
    if (keyboardRef.current) keyboardRef.current.setInput(value);
  };

  const onVoucherKeyboardChange = (input: string) => {
    const value = input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setVoucherCode(value);
    setVoucherError(null);
    if (keyboardRef.current) keyboardRef.current.setInput(value);
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

      if (response.ok && result.valid) {
        const discount = result.data?.discount_percentage ?? 100;
        if (discount === 100) {
          setIsVoucherModalOpen(false);
          handlePrint(true, pendingPrintQty, selectedPrintSize);
        } else {
          // Calculate discounted amount
          const discountedAmount = pendingPrintAmount * (1 - (discount / 100));
          setIsVoucherModalOpen(false);
          handleExtraPrintPayment(discountedAmount, pendingPrintQty, selectedPrintSize);
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

  const handleExtraPrintPayment = async (amount: number, totalQty: number, size: "4R" | "2R") => {
    setPendingPrintQty(totalQty);
    setPendingPrintAmount(amount);
    setSelectedPrintSize(size);
    setIsQrisModalOpen(true);
    setQrisState("loading");
    setQrisData(null);
    setTimeLeft(180); // 3 minutes is enough for extra print
    
    try {
      const response = await fetch(`/api/generate-qris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          canvas_type: canvasType,
          gateway_name: pricing?.name,
          server_key: pricing?.server_key,
          client_key: pricing?.client_key,
          is_production: pricing?.is_production === true,
        })
      });
      const result = await response.json();
      if (result.success) {
        setQrisData(result.data);
        setQrisState("ready");
      } else {
        setQrisState("error");
      }
    } catch (e) { setQrisState("error"); }
  };

  useEffect(() => {
    if (qrisState !== "ready" || !isQrisModalOpen) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/check-status?order_id=${qrisData?.order_id}&server_key=${pricing?.server_key}&is_production=${pricing?.is_production ? "1" : "0"}`);
        const result = await response.json();
        if (result.success && result.data?.status === "paid") {
          setQrisState("success");
          clearInterval(interval);
          setTimeout(() => { 
            setIsQrisModalOpen(false); 
            // Cetak dengan quantity yang sudah dibayar
            handlePrint(true, pendingPrintQty, selectedPrintSize); 
          }, 2000);
        }
      } catch (e) { }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrisState, isQrisModalOpen, qrisData, pricing]);

  useEffect(() => {
    if (previewMode === "gif" && rawPhotos.length > 0) {
      const interval = setInterval(() => {
        setCurrentGifIndex((prev) => (prev + 1) % rawPhotos.length);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [previewMode, rawPhotos]);

  useEffect(() => {
    if (qrisState === "ready" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) setQrisState("error");
  }, [qrisState, timeLeft]);

  // ── Auto-redirect to home after 5 mins when upload is done ──
  useEffect(() => {
    if (uploadStage === "success") {
      setAutoRedirectCountdown(300);
      const interval = setInterval(() => {
        setAutoRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // Clean up session data before redirect
            const sessionKeys = [
              "finalRenderImage",
              "rawPhotos",
              "capturedPhotos",
              "frameEdits",
              "templates",
              "templates_base_url",
              "stickers",
              "transactionDbId",
              "transactionId",
              "session_expiry",
              "order_id"
            ];
            sessionKeys.forEach(key => localStorage.removeItem(key));
            localforage.removeItem("liveVideos");
            localforage.removeItem("finalLiveVideo");
            localforage.removeItem("finalGifVideo");
            localStorage.removeItem("finalRenderImage");
            router.push("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      autoRedirectRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [uploadStage, router]);

  const handleNewSession = async () => {
    // Cancel auto-redirect if running
    if (autoRedirectRef.current) {
      clearInterval(autoRedirectRef.current);
      autoRedirectRef.current = null;
    }

    // Apabila user memaksa sesi baru saat upload masih berjalan/gagal, selamatkan tanpa duplikat!
    if (uploadStage !== "success" && uploadPromiseRef.current) {
      console.log("[Print] Membatalkan koneksi aktif untuk mengalihkan ke BackgroundUploader...");
      if (activeAbortControllerRef.current) activeAbortControllerRef.current.abort();
      if (activeXhrRef.current) activeXhrRef.current.abort();
      // Tunggu catch(e) di performUpload menyelesaikan tugas bungkus offline_queue
      await uploadPromiseRef.current;
    }

    // Hanya hapus data sesi, JANGAN hapus konfigurasi mesin (localStorage.clear())
    const sessionKeys = [
      "finalRenderImage",
      "rawPhotos",
      "capturedPhotos",
      "frameEdits",
      "templates",
      "templates_base_url",
      "stickers",
      "transactionDbId",
      "transactionId",
      "session_expiry",
      "order_id"
    ];
    
    sessionKeys.forEach(key => localStorage.removeItem(key));
    
    // Juga bersihkan localforage (video)
    localforage.removeItem("liveVideos");
    localforage.removeItem("finalLiveVideo");
    localforage.removeItem("finalGifVideo");

    router.push("/");
  };

  if (!finalImage) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-2 sm:p-3" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        {!customBgImage && (
          <>
            {/* Background decoration */}
            <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
            <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          </>
        )}
        <div className="w-16 h-16 border-8 border-black border-t-transparent rounded-full animate-spin z-10"></div>
      </div>
    );
  }

  const downloadUrl = `https://clicksy-booth.ctechcreative.com/downloads/${downloadToken}`;

  return (
    <div className="relative h-screen w-full overflow-hidden p-2 sm:p-3 font-sans text-slate-900 flex flex-col" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}
      <div className="relative flex-1 flex flex-col rounded-[30px] overflow-hidden min-h-0 z-10">
        
        <header className="px-5 py-2 flex items-center justify-between shrink-0">
           <h1 className={`${poppins.className} text-white text-base sm:text-lg uppercase tracking-widest drop-shadow-md font-bold`}>CETAK HASIL</h1>
           <div className="bg-white/20 px-4 py-1.5 rounded-full border border-white/40 text-white font-black text-xs sm:text-sm tracking-widest">
             READY FOR PRINT
           </div>
        </header>

        <main className="flex-1 flex flex-col gap-3 px-4 pb-3 min-h-0 overflow-hidden">

          <div className="flex-1 flex flex-col portrait:flex-col landscape:flex-row gap-4 min-h-0 overflow-hidden">

            <div className="flex-[1.65] flex flex-col min-h-0 min-w-0 gap-2">

              <h2 className={`${poppins.className} text-white text-sm uppercase tracking-widest text-center shrink-0 drop-shadow-md font-bold`}>
                PREVIEW HASIL
              </h2>

          <div className="flex-1 min-h-0 bg-white rounded-[20px] shadow-2xl flex flex-col p-3 overflow-hidden border-3 border-white relative">
             <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-50 rounded-[1.5rem] relative shadow-inner min-h-0">
                 {previewMode === "photo" ? (
                    <img src={finalImage} alt="Final" className="h-full object-contain select-none animate-in fade-in duration-500" />
                 ) : previewMode === "gif" && rawPhotos.length > 0 ? (
                    <img src={rawPhotos[currentGifIndex]} alt="GIF Preview" className="h-full object-contain select-none" />
                 ) : finalVideoUrl ? (
                    <video src={finalVideoUrl} autoPlay loop muted className="h-full object-contain select-none animate-in fade-in duration-500" />
                 ) : (
                    <div className="flex flex-col items-center text-slate-300 gap-2">
                       <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-300 rounded-full animate-spin"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest">Memuat Video...</span>
                    </div>
                 )}
             </div>

             <div className="flex gap-2 mt-3 shrink-0 justify-center">
                <button 
                  onClick={() => setPreviewMode("photo")}
                  className={`px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${previewMode === "photo" ? "bg-black text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}
                >
                  PHOTO
                </button>
                <button 
                  onClick={() => setPreviewMode("gif")}
                  className={`px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${previewMode === "gif" ? "bg-black text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}
                >
                  GIF
                </button>
                <button 
                  onClick={() => setPreviewMode("live")}
                  className={`px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${previewMode === "live" ? "bg-black text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}
                >
                  LIVE
                </button>
             </div>
          </div>

            </div>



            <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-2">

              <h2 className={`${poppins.className} text-white text-sm uppercase tracking-widest text-center shrink-0 drop-shadow-md font-bold`}>
                UNDUH & CETAK
              </h2>

          <div className="flex-1 min-h-0 bg-white rounded-[20px] shadow-2xl flex flex-row flex-wrap items-center justify-center p-2 sm:p-4 overflow-y-auto border-3 border-white gap-2 sm:gap-4">
             
             <div className="shrink-0 flex flex-col items-center justify-center text-center flex-1 min-w-[200px] max-w-[280px]">
                 <h3 className={`${poppins.className} text-slate-900 text-sm uppercase leading-relaxed mb-1 font-bold`}>SCAN QR CODE</h3>
                 <h3 className={`${poppins.className} text-black text-[10px] uppercase mb-2 tracking-tighter font-bold`}>DOWNLOAD SOFTFILE</h3>

                 <div className="p-3 sm:p-4 bg-black rounded-[2rem] shadow-xl relative group mx-auto">
                    <div className="bg-white p-3 sm:p-4 rounded-[1.2rem] shadow-inner flex items-center justify-center">
                       <QRCode value={downloadUrl} size={150} level="H" />
                    </div>
                {uploadStage !== "success" && (
                   <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-[3rem] flex items-center justify-center flex-col p-6">
                      {uploadStage === "error" ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mb-3"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">UPLOAD GAGAL</span>
                        </>
                      ) : (
                        <>
                          <div className="relative w-16 h-16 mb-3">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                              <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - uploadProgress / 100)}`}
                                strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-300" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-sm font-black">{uploadProgress}%</span>
                            </div>
                          </div>
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">MENGUNGGAH...</span>
                        </>
                      )}
                   </div>
                )}
             </div>

             </div>

             <div className="shrink-0 flex flex-col items-center justify-center flex-1 min-w-[200px] max-w-[280px] gap-2">
                {/* Print Quantity Selector */}
                <div className="flex flex-col items-center mb-1 w-full">
                  <p className={`${poppins.className} text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-bold`}>JUMLAH CETAK</p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                      disabled={isPrinting}
                      className="w-10 h-10 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className={`${poppins.className} text-3xl text-slate-800 tabular-nums font-black`}>{printCopies}</span>
                    <button 
                      onClick={() => setPrintCopies(Math.min(10, printCopies + 1))}
                      disabled={isPrinting}
                      className="w-10 h-10 rounded-lg bg-black/10 border-2 border-black/20 flex items-center justify-center text-black hover:bg-black/20 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  
                  {/* Total Price Display */}
                  <div className="mt-3 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ESTIMASI BIAYA:</span>
                    <span className="text-sm font-black text-black">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
                        amountPrintForCanvas(pricing, canvasType) * (hasPrinted ? printCopies : Math.max(0, printCopies - 1))
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex w-full justify-center mt-1">
                  <button 
                    onClick={() => {
                      const cat = templateCategory.toUpperCase();
                      let printSize: "4R" | "2R" = "4R";
                      if (cat === "REGULER") {
                        printSize = "2R";
                      } else if (cat === "REGULER-NOSTRIP") {
                        printSize = "4R";
                      } else if (canvasType === "flipbook") {
                        printSize = "2R";
                      } else {
                        printSize = "4R"; // default
                      }
                      handleMainPrintAction(printSize);
                    }}
                    disabled={isPrinting}
                    className={`flex-1 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${isPrinting ? 'bg-slate-100 text-slate-400' : 'bg-black text-white hover:scale-[1.03] active:scale-95'}`}
                  >
                    {isPrinting ? "..." : hasPrinted ? "TAMBAH CETAK" : "CETAK SEKARANG"}
                  </button>
                </div>
             </div>
          </div>

            </div>

          </div>

        </main>

        <footer className="shrink-0 flex items-center justify-center gap-4 py-3">
           {autoRedirectCountdown !== null && autoRedirectCountdown > 0 && (
             <div className="flex items-center gap-2 bg-white/20 px-5 py-2.5 rounded-full border border-white/40 text-white animate-in fade-in duration-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                 <path d="M21 12a9 9 0 1 1-6.219-8.56" />
               </svg>
               <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                 Kembali ke menu dalam {autoRedirectCountdown} detik
               </span>
             </div>
           )}
           <button
             onClick={handleNewSession}
             className="rounded-lg bg-white px-10 py-2.5 text-sm font-black uppercase tracking-widest text-black shadow-2xl transition-transform hover:scale-[1.03] active:scale-[0.98]"
           >
             SESI BARU
           </button>
        </footer>

      </div>

      {/* Payment Method Modal for Extra Print */}
      {isPaymentMethodModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg animate-in zoom-in-95 rounded-[3rem] bg-white p-8 shadow-2xl duration-300 flex flex-col gap-4">
            <h2 className="text-center text-2xl font-black text-slate-800 mb-4 uppercase tracking-widest">Metode Pembayaran</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {enableQris && (
                <button
                  onClick={() => {
                    setIsPaymentMethodModalOpen(false);
                    handleExtraPrintPayment(pendingPrintAmount, pendingPrintQty, selectedPrintSize);
                  }}
                  className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 hover:bg-slate-100 hover:border-slate-300 transition-all"
                >
                  <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-orange-100 text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
                  </div>
                  <span className="font-black text-slate-700 uppercase">QRIS</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setIsPaymentMethodModalOpen(false);
                  setIsVoucherModalOpen(true);
                }}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 hover:bg-slate-100 hover:border-slate-300 transition-all ${enableQris ? 'flex-1' : 'w-full max-w-[240px] mx-auto'}`}
              >
                <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-100 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" /><path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z" /></svg>
                </div>
                <span className="font-black text-slate-700 uppercase">VOUCHER</span>
              </button>
            </div>
            <button onClick={() => setIsPaymentMethodModalOpen(false)} className="mt-4 w-full rounded-full bg-slate-100 py-4 font-bold text-slate-500 hover:bg-slate-200">
              BATAL
            </button>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm animate-in zoom-in-95 rounded-3xl bg-white p-8 shadow-2xl duration-300">
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/15 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" /><path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z" /></svg>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">Kode Voucher</h3>
              <p className="mt-2 px-2 text-center text-sm font-medium text-slate-500">Masukkan 8 digit kode voucher Anda.</p>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
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
                  <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                ) : "GUNAKAN"}
              </button>
            </div>
            
            {showVoucherKeyboard && (
              <div className="mt-6">
                <Keyboard
                  keyboardRef={(r: any) => (keyboardRef.current = r)}
                  layout={{
                    default: [
                      "1 2 3 4 5 6 7 8 9 0",
                      "Q W E R T Y U I O P",
                      "A S D F G H J K L",
                      "Z X C V B N M {bksp}",
                    ],
                  }}
                  display={{ "{bksp}": "⌫" }}
                  onChange={onVoucherKeyboardChange}
                  theme={"hg-theme-default custom-keyboard"}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* QRIS Modal for Extra Print */}
      {isQrisModalOpen && (
        <QrisModal 
          basePrice={pendingPrintAmount} 
          gatewayName={pricing?.name || "QRIS"} 
          onClose={() => setIsQrisModalOpen(false)}
          qrisState={qrisState}
          qrisData={qrisData}
          timeLeft={timeLeft}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-16 h-16 border-8 border-black border-t-transparent rounded-full animate-spin"></div></div>}>
      <PrintContent />
    </Suspense>
  );
}
