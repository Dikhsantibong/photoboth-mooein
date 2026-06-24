"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import localforage from "localforage";
import dynamic from "next/dynamic";
import "react-simple-keyboard/build/css/index.css";

const Keyboard = dynamic(() => import("react-simple-keyboard"), { ssr: false });

interface EnvData {
  TOKEN?: string;
  BASE_URL?: string;
  NEXT_PUBLIC_BASE_URL?: string;
  [key: string]: string | undefined;
}

export default function SettingsPage() {
  const router = useRouter();
  const [envData, setEnvData] = useState<EnvData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<EnvData>({});

  // Hardware states
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [printerName, setPrinterName] = useState<string>("");
  const [printerSplitName, setPrinterSplitName] = useState<string>("");
  const [printerOrientation, setPrinterOrientation] = useState<string>("landscape");
  const [nativeDslrCapture, setNativeDslrCapture] = useState<boolean>(false);
  const [digiCamLiveView, setDigiCamLiveView] = useState<boolean>(false);
  const [orderPrefix, setOrderPrefix] = useState<string>("MOOEIN");
  const [welcomeBgImage, setWelcomeBgImage] = useState<string>("");
  const [enabledCanvas, setEnabledCanvas] = useState<Record<string, boolean>>({
    koran: true,
    reguler: true,
    flipbook: true
  });
  const [sessionTimeout, setSessionTimeout] = useState<number>(300);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<boolean>(false);
  const [gestureDetection, setGestureDetection] = useState<boolean>(false);
  const [countdownDuration, setCountdownDuration] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<"api" | "hardware" | "display" | "features" | "session">("api");

  // Queue state
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);

  // Keyboard state
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");
  const keyboardRef = useRef<any>(null);

  const onKeyboardChange = (input: string) => {
    if (focusedInput === "sessionTimeout") {
      setSessionTimeout(parseInt(input) || 0);
    } else if (focusedInput) {
      handleChange(focusedInput, input);
    }
  };

  const onKeyboardKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
    }
  };

  const onInputFocus = (key: string, value: string) => {
    setFocusedInput(key);
    if (keyboardRef.current) {
      keyboardRef.current.setInput(value);
    }
  };

  const fetchQueue = async () => {
    try {
      const keysRaw = await localforage.getItem<string[]>("offline_upload_keys");
      const keys = keysRaw || [];
      const queueItems = [];
      for (const key of keys) {
        const item = await localforage.getItem<any>(key);
        if (item) queueItems.push({ key, ...item });
      }
      setUploadQueue(queueItems);
    } catch (e) {
      console.error("Failed to fetch queue", e);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus semua antrean upload? Transaksi yang belum terupload tidak akan masuk ke server.")) return;
    try {
      const keysRaw = await localforage.getItem<string[]>("offline_upload_keys");
      if (keysRaw && Array.isArray(keysRaw)) {
        for (const key of keysRaw) {
          await localforage.removeItem(key);
        }
      }
      await localforage.setItem("offline_upload_keys", []);
      setUploadQueue([]);
      showToast("Antrean berhasil dihapus!", "success");
    } catch (e) {
      showToast("Gagal menghapus antrean", "error");
    }
  };

  const fetchEnv = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/env");
      const json = await res.json();
      if (json.success) {
        setEnvData(json.data);
        setOriginalData(json.data);
      } else {
        showToast("Gagal membaca konfigurasi", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHardware = useCallback(async () => {
    try {
      // Get cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);

      // Get printers
      try {
        const pRes = await fetch("/api/printers");
        const pJson = await pRes.json();
        if (pJson.success) {
          setPrinters(pJson.data);
        }
      } catch (err) {
        console.error("Failed to fetch printers:", err);
      }
      
      // Load saved hardware settings
      const savedCamera = localStorage.getItem("preferredCameraId");
      if (savedCamera) setSelectedCamera(savedCamera);
      
      const savedPrinter = localStorage.getItem("preferredPrinterName");
      if (savedPrinter) setPrinterName(savedPrinter);

      const savedPrinterSplit = localStorage.getItem("preferredPrinterSplitName");
      if (savedPrinterSplit) setPrinterSplitName(savedPrinterSplit);

      const savedOrientation = localStorage.getItem("printerOrientation");
      if (savedOrientation) setPrinterOrientation(savedOrientation);

      const savedNativeDslr = localStorage.getItem("nativeDslrCapture");
      if (savedNativeDslr) setNativeDslrCapture(savedNativeDslr === "true");

      const savedDigiCamLive = localStorage.getItem("digiCamLiveView");
      if (savedDigiCamLive) setDigiCamLiveView(savedDigiCamLive === "true");

      const savedPrefix = localStorage.getItem("orderPrefix");
      if (savedPrefix) setOrderPrefix(savedPrefix);

      const savedBg = localStorage.getItem("welcomeBgImage");
      if (savedBg) setWelcomeBgImage(savedBg);

      const savedCanvasRaw = localStorage.getItem("enabledCanvas");
      if (savedCanvasRaw) {
        try {
          setEnabledCanvas(JSON.parse(savedCanvasRaw));
        } catch(e) {}
      }

      const savedTimeout = localStorage.getItem("sessionTimeout");
      if (savedTimeout) setSessionTimeout(parseInt(savedTimeout, 10));

      const savedAutoAdvance = localStorage.getItem("autoAdvanceCountdown");
      if (savedAutoAdvance) setAutoAdvanceCountdown(savedAutoAdvance === "true");

      const savedGesture = localStorage.getItem("gestureDetection");
      if (savedGesture) setGestureDetection(savedGesture === "true");

      const savedCountdown = localStorage.getItem("countdownDuration");
      if (savedCountdown) setCountdownDuration(parseInt(savedCountdown, 10));

    } catch (err) {
      console.error("Hardware fetch err:", err);
    }
  }, []);

  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([]);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const fetchBackgrounds = async () => {
    try {
      const res = await fetch("/api/backgrounds");
      const json = await res.json();
      if (json.success) {
        setUploadedBackgrounds(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch backgrounds", e);
    }
  };

  useEffect(() => {
    fetchEnv();
    fetchHardware();
    fetchQueue();
    fetchBackgrounds();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchEnv, fetchHardware]);

  useEffect(() => {
    const changed = Object.keys(envData).some(
      (key) => envData[key] !== originalData[key]
    );
    setHasChanges(changed);
  }, [envData, originalData]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (key: string, value: string) => {
    setEnvData((prev) => ({ ...prev, [key]: value }));
    if (keyboardRef.current && focusedInput === key) {
      keyboardRef.current.setInput(value);
    }
  };

  const handleSaveEnv = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: envData }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Konfigurasi API berhasil disimpan!", "success");
        setOriginalData({ ...envData });
        setHasChanges(false);
      } else {
        showToast(json.message || "Gagal menyimpan", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHardware = () => {
    localStorage.setItem("preferredCameraId", selectedCamera);
    localStorage.setItem("preferredPrinterName", printerName);
    localStorage.setItem("preferredPrinterSplitName", printerSplitName);
    localStorage.setItem("printerOrientation", printerOrientation);
    localStorage.setItem("nativeDslrCapture", nativeDslrCapture ? "true" : "false");
    localStorage.setItem("digiCamLiveView", digiCamLiveView ? "true" : "false");
    localStorage.setItem("orderPrefix", orderPrefix.toUpperCase());
    localStorage.setItem("welcomeBgImage", welcomeBgImage);
    localStorage.setItem("enabledCanvas", JSON.stringify(enabledCanvas));
    localStorage.setItem("sessionTimeout", sessionTimeout.toString());
    localStorage.setItem("autoAdvanceCountdown", autoAdvanceCountdown ? "true" : "false");
    localStorage.setItem("gestureDetection", gestureDetection ? "true" : "false");
    localStorage.setItem("countdownDuration", countdownDuration.toString());
    showToast("Pengaturan Hardware & Fitur disimpan!", "success");
  };

  const handleBack = () => {
    router.push("/");
  };

  const toggleCanvas = (id: string) => {
    setEnabledCanvas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const envFields = [
    {
      key: "TOKEN",
      label: "Machine Token",
      description: "Token autentikasi untuk mesin photobooth ini",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      type: "password" as const,
    },
    {
      key: "BASE_URL",
      label: "Base URL (Server)",
      description: "URL backend server untuk API calls",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      type: "url" as const,
    },
    {
      key: "NEXT_PUBLIC_BASE_URL",
      label: "Public Base URL",
      description: "URL publik yang digunakan di sisi client",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      type: "url" as const,
    },
  ];

  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-slate-50 via-white to-orange-50/30 font-sans text-slate-900 flex flex-col overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-orange-100/30 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-amber-100/30 blur-[150px] pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-semibold text-sm transition-all duration-300 animate-slide-down ${
            toast.type === "success"
              ? "bg-gradient-to-r from-emerald-500 to-green-500"
              : "bg-gradient-to-r from-red-500 to-rose-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-6 border-b border-slate-100/80 bg-white/60 backdrop-blur-xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors duration-200 group"
        >
          <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-wide">Kembali</span>
        </button>

        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Konfigurasi Mesin</h1>
          <p className="text-xs text-slate-400 mt-0.5">Pengaturan Hardware & Server</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => {
              if ((window as any).electron?.restartApp) {
                (window as any).electron.restartApp();
              } else {
                console.warn("Electron restartApp not available");
                window.location.reload(); // Fallback to refresh if possible
              }
            }}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-amber-600 active:scale-95 transition-all uppercase tracking-widest"
          >
            RESTART
          </button>
          <button 
            onClick={() => {
              if ((window as any).electron?.closeApp) {
                (window as any).electron.closeApp();
              } else {
                console.warn("Electron closeApp not available");
                showToast("Fitur Close hanya tersedia di aplikasi desktop", "error");
              }
            }}
            className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-rose-700 active:scale-95 transition-all uppercase tracking-widest"
          >
            CLOSE
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative z-10 w-full px-4 sm:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="h-10 w-10 rounded-full border-[3px] border-slate-200 border-t-orange-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Memuat konfigurasi...</p>
          </div>
        ) : (
          <div className="h-full flex flex-col lg:flex-row gap-8 overflow-hidden max-w-7xl mx-auto w-full">
            
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto custom-scrollbar pb-4 lg:pb-6 pr-2">
               <button onClick={() => setActiveTab('api')} className={`text-left px-5 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shrink-0 ${activeTab === 'api' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                 <div className={`p-2 rounded-xl ${activeTab === 'api' ? 'bg-white/20' : 'bg-orange-100 text-orange-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                 </div>
                 API Server
               </button>
               <button onClick={() => setActiveTab('hardware')} className={`text-left px-5 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shrink-0 ${activeTab === 'hardware' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                 <div className={`p-2 rounded-xl ${activeTab === 'hardware' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM7 21h10M12 18v3"/></svg>
                 </div>
                 Hardware Mesin
               </button>
               <button onClick={() => setActiveTab('display')} className={`text-left px-5 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shrink-0 ${activeTab === 'display' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                 <div className={`p-2 rounded-xl ${activeTab === 'display' ? 'bg-white/20' : 'bg-purple-100 text-purple-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                 </div>
                 Tampilan Visual
               </button>
               <button onClick={() => setActiveTab('features')} className={`text-left px-5 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shrink-0 ${activeTab === 'features' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                 <div className={`p-2 rounded-xl ${activeTab === 'features' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
                 </div>
                 Manajemen Fitur
               </button>
               <button onClick={() => setActiveTab('session')} className={`text-left px-5 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shrink-0 ${activeTab === 'session' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                 <div className={`p-2 rounded-xl ${activeTab === 'session' ? 'bg-white/20' : 'bg-rose-100 text-rose-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                 </div>
                 Sistem & Antrean
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 lg:pl-6 pr-2 lg:pr-6">
               
               {activeTab === 'api' && (
                 <section className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">API Server</h2>
                   </div>
                   
                   <div className="bg-amber-50/80 border border-amber-200/50 rounded-2xl p-5 flex gap-4 items-start">
                     <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-amber-800 mb-1">Perhatian</p>
                       <p className="text-xs text-amber-700/80 leading-relaxed">
                         Perubahan konfigurasi API memerlukan <strong>restart aplikasi</strong> agar berlaku sepenuhnya.
                       </p>
                     </div>
                   </div>

                   {envFields.map((field) => (
                     <div key={field.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 transition-all hover:border-slate-200 hover:shadow-md">
                       <div className="flex items-start gap-4">
                         <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl shrink-0 mt-0.5">{field.icon}</div>
                         <div className="flex-1 min-w-0">
                           <label className="block text-sm font-bold text-slate-700 mb-1">{field.label}</label>
                           <p className="text-[11px] text-slate-400 mb-3">{field.description}</p>
                           <div className="relative">
                             <input
                               type={field.type === "password" && !visibleFields[field.key] ? "password" : "text"}
                               value={envData[field.key] || ""}
                               onFocus={() => onInputFocus(field.key, envData[field.key] || "")}
                               onChange={(e) => handleChange(field.key, e.target.value)}
                               placeholder={`Masukkan ${field.label}...`}
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                             />
                             {field.type === "password" && (
                               <button type="button" onClick={() => toggleVisibility(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                 {visibleFields[field.key] ? (
                                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                                 ) : (
                                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
                                 )}
                               </button>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                   
                   <div className="pt-4">
                     <button
                       onClick={handleSaveEnv}
                       disabled={saving || !hasChanges}
                       className={`w-full py-4 rounded-2xl font-bold transition-all shrink-0 ${hasChanges ? "bg-orange-600 text-white shadow-lg hover:bg-orange-700" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                     >
                       {saving ? "Menyimpan..." : "Simpan Config Server"}
                     </button>
                   </div>
                 </section>
               )}

               {activeTab === 'hardware' && (
                 <section className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">Hardware Mesin</h2>
                   </div>

                   {/* Camera */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Pilih Kamera</label>
                         <p className="text-[11px] text-slate-400 mb-3">Tentukan kamera input yang akan digunakan</p>
                         <select
                           value={selectedCamera}
                           onChange={(e) => setSelectedCamera(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 appearance-none bg-no-repeat bg-[right_1rem_center]"
                           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                         >
                           <option value="">Default (Auto)</option>
                           {cameras.map((cam) => (<option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Kamera ${cam.deviceId.slice(0, 5)}`}</option>))}
                         </select>
                       </div>
                     </div>
                   </div>

                   {/* Native DSLR Toggle */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                       </div>
                       <div className="flex-1 min-w-0 flex items-center justify-between">
                         <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Native DSLR Capture (Flash Sync)</label>
                           <p className="text-[11px] text-slate-400">Picu tombol shutter kamera asli via digiCamControl agar Flash eksternal menyala. Wajib install digiCamControl.</p>
                         </div>
                         <button
                           onClick={() => setNativeDslrCapture(!nativeDslrCapture)}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${nativeDslrCapture ? 'bg-emerald-500' : 'bg-slate-200'}`}
                         >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${nativeDslrCapture ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                       </div>
                     </div>
                   </div>

                   {/* digiCamControl Live View Toggle */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                       </div>
                       <div className="flex-1 min-w-0 flex items-center justify-between">
                         <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Live View digiCamControl (1 Kabel USB)</label>
                           <p className="text-[11px] text-slate-400">Menyalin video layar dari server digiCamControl. WAJIB aktifkan Web Server di digiCamControl port 5513. FPS akan lebih rendah.</p>
                         </div>
                         <button
                           onClick={() => setDigiCamLiveView(!digiCamLiveView)}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${digiCamLiveView ? 'bg-emerald-500' : 'bg-slate-200'}`}
                         >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${digiCamLiveView ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                       </div>
                     </div>
                   </div>

                   {/* Printer Utama */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Printer Utama (4R)</label>
                         <p className="text-[11px] text-slate-400 mb-3">Driver untuk cetak reguler 4R (Standar)</p>
                         <select
                           value={printerName}
                           onChange={(e) => setPrinterName(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 appearance-none bg-no-repeat bg-[right_1rem_center]"
                           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                         >
                           <option value="">Default (Auto)</option>
                           {printers.map((printer) => (<option key={printer} value={printer}>{printer}</option>))}
                         </select>
                       </div>
                     </div>
                   </div>

                   {/* Printer Orientation */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Orientasi Cetak (Tipe Printer)</label>
                         <p className="text-[11px] text-slate-400 mb-3">DNP = kertas keluar landscape (diputar). Epson = kertas keluar portrait (sesuai template).</p>
                         <select
                           value={printerOrientation}
                           onChange={(e) => setPrinterOrientation(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 appearance-none bg-no-repeat bg-[right_1rem_center]"
                           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                         >
                           <option value="landscape">DNP (Landscape — Putar Otomatis)</option>
                           <option value="portrait">Epson L18050 (Portrait — Sesuai Template)</option>
                         </select>
                       </div>
                     </div>
                   </div>

                   {/* Printer Split */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M8 11h8"/><path d="M12 7v8"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Printer Split (2R / Flipbook)</label>
                         <p className="text-[11px] text-slate-400 mb-3">Driver khusus dengan mode potong (Split)</p>
                         <select
                           value={printerSplitName}
                           onChange={(e) => setPrinterSplitName(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 appearance-none bg-no-repeat bg-[right_1rem_center]"
                           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                         >
                           <option value="">Pilih Driver Split...</option>
                           {printers.map((printer) => (<option key={printer} value={printer}>{printer}</option>))}
                         </select>
                       </div>
                     </div>
                   </div>
                   
                   <div className="pt-4">
                     <button
                       onClick={handleSaveHardware}
                       className="w-full py-4 rounded-2xl font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all font-black uppercase tracking-widest text-sm shrink-0"
                     >
                       Simpan Hardware
                     </button>
                   </div>
                 </section>
               )}

               {activeTab === 'display' && (
                 <section className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tampilan Visual</h2>
                   </div>

                   {/* Awalan Order ID */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Awalan Order ID (Prefix)</label>
                         <p className="text-[11px] text-slate-400 mb-3">Teks ini akan menjadi awalan nomor Invoice (Contoh: {orderPrefix}-12345678). Gunakan huruf kapital, maksimal 10 karakter.</p>
                         <input
                           type="text"
                           value={orderPrefix}
                           onChange={(e) => setOrderPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10))}
                           placeholder="Contoh: CTECH"
                           className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Background Welcome Page */}
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                     <div className="flex items-start gap-4">
                       <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl shrink-0 mt-0.5">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                       </div>
                       <div className="flex-1 min-w-0">
                         <label className="block text-sm font-bold text-slate-700 mb-1">Background Seluruh Halaman</label>
                         <p className="text-[11px] text-slate-400 mb-3">Pilih gambar kustom untuk latar belakang seluruh halaman aplikasi.</p>
                         
                         {/* Grid of uploaded backgrounds */}
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                           {uploadedBackgrounds.map((bgUrl) => (
                             <div 
                               key={bgUrl} 
                               className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all aspect-video ${welcomeBgImage === bgUrl ? 'border-purple-500 shadow-md ring-2 ring-purple-500/30' : 'border-slate-200 hover:border-slate-300'}`}
                             >
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img onClick={() => setWelcomeBgImage(bgUrl)} src={bgUrl} alt="Background" className="w-full h-full object-cover" />
                               {welcomeBgImage === bgUrl && (
                                 <div className="absolute top-2 left-2 bg-purple-500 text-white rounded-full p-1 shadow-md pointer-events-none">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                 </div>
                               )}
                               <button 
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   if (!confirm("Hapus background ini secara permanen?")) return;
                                   try {
                                     const filename = bgUrl.split('/').pop();
                                     const res = await fetch(`/api/backgrounds?file=${filename}`, { method: 'DELETE' });
                                     const data = await res.json();
                                     if (data.success) {
                                       if (welcomeBgImage === bgUrl) setWelcomeBgImage("");
                                       fetchBackgrounds();
                                     } else {
                                       alert('Gagal menghapus: ' + data.message);
                                     }
                                   } catch (e) {
                                     alert('Terjadi kesalahan saat menghapus');
                                   }
                                 }}
                                 className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-md"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                               </button>
                             </div>
                           ))}
                         </div>
                         
                         {uploadedBackgrounds.length > 0 && welcomeBgImage && (
                           <div className="mb-4">
                             <button onClick={() => setWelcomeBgImage("")} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1">
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                               Hapus Latar Belakang Aktif
                             </button>
                           </div>
                         )}
                         
                         {welcomeBgImage && !uploadedBackgrounds.includes(welcomeBgImage) && (
                           <div className="mb-3 relative w-full sm:w-1/2 h-32 rounded-xl overflow-hidden border-2 border-purple-500 ring-2 ring-purple-500/30 shadow-md">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={welcomeBgImage} alt="Welcome BG" className="w-full h-full object-cover" />
                              <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                              <button onClick={() => setWelcomeBgImage("")} className="absolute bottom-2 right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:bg-rose-600 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                           </div>
                         )}
     
                         <input
                           type="file"
                           accept="image/*"
                           disabled={isUploadingBg || uploadedBackgrounds.length >= 5}
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               setIsUploadingBg(true);
                               try {
                                 const formData = new FormData();
                                 formData.append('file', file);
                                 const res = await fetch('/api/backgrounds', {
                                   method: 'POST',
                                   body: formData
                                 });
                                 const data = await res.json();
                                 if (data.success) {
                                   setWelcomeBgImage(data.url);
                                   fetchBackgrounds(); // Refresh list
                                 } else {
                                   alert('Gagal mengupload background: ' + data.message);
                                 }
                               } catch (err) {
                                 alert('Terjadi kesalahan saat upload');
                               } finally {
                                 setIsUploadingBg(false);
                               }
                             }
                           }}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                         />
                         {isUploadingBg && <p className="text-xs text-purple-600 mt-2 font-bold animate-pulse">Mengupload gambar...</p>}
                         {uploadedBackgrounds.length >= 5 && <p className="text-xs text-rose-500 mt-2 font-bold">Batas maksimal 5 gambar tercapai. Hapus gambar lama untuk mengupload yang baru.</p>}
                        </div>
                     </div>
                   </div>

                   <div className="pt-4">
                     <button
                       onClick={handleSaveHardware}
                       className="w-full py-4 rounded-2xl font-bold bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all font-black uppercase tracking-widest text-sm shrink-0"
                     >
                       Simpan Tampilan
                     </button>
                   </div>
                 </section>
               )}

               {activeTab === 'features' && (
                 <section className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                   <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Fitur</h2>
                   </div>

                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100 mb-6">
                     {[
                       { id: 'koran', label: 'Kanvas Koran', desc: 'Layout ala koran editorial' },
                       { id: 'reguler', label: 'Kanvas Reguler', desc: 'Layout photostrip klasik' },
                       { id: 'flipbook', label: 'Kanvas Flipbook', desc: 'Animasi flipbook video' }
                     ].map((item) => (
                       <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-700">{item.label}</span>
                           <span className="text-[11px] text-slate-400">{item.desc}</span>
                         </div>
                         <button
                           onClick={() => toggleCanvas(item.id)}
                           className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabledCanvas[item.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                         >
                           <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabledCanvas[item.id] ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                       </div>
                     ))}
                   </div>

                   <h3 className="text-lg font-bold text-slate-800 tracking-tight mt-6 mb-3">Waktu & Durasi</h3>
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                     <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex flex-col pr-4">
                         <span className="text-sm font-bold text-slate-700">Durasi Hitung Mundur (Detik)</span>
                         <span className="text-[11px] text-slate-400">Pilih durasi waktu sebelum foto diambil secara otomatis.</span>
                       </div>
                       <select
                         value={countdownDuration}
                         onChange={(e) => setCountdownDuration(parseInt(e.target.value))}
                         className="bg-slate-100 text-slate-800 text-sm font-bold rounded-xl px-4 py-2 border-0 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                       >
                         <option value={3}>3 Detik</option>
                         <option value={5}>5 Detik</option>
                         <option value={10}>10 Detik</option>
                       </select>
                     </div>
                   </div>

                   <h3 className="text-lg font-bold text-slate-800 tracking-tight mt-6 mb-3">Otomasi Sesi Foto</h3>
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                     <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex flex-col pr-4">
                         <span className="text-sm font-bold text-slate-700">Auto-Advance Countdown</span>
                         <span className="text-[11px] text-slate-400">Pindah ke frame berikutnya secara otomatis dengan jeda 2 detik (tanpa perlu menekan tombol Lanjut).</span>
                       </div>
                       <button
                         onClick={() => {
                           setAutoAdvanceCountdown(!autoAdvanceCountdown);
                           if (!autoAdvanceCountdown) setGestureDetection(false); // Matikan gesture jika auto-advance hidup
                         }}
                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoAdvanceCountdown ? 'bg-indigo-600' : 'bg-slate-200'}`}
                       >
                         <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoAdvanceCountdown ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                     </div>

                     <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex flex-col pr-4">
                         <span className="text-sm font-bold text-slate-700">Deteksi Jari (V-Sign ✌️)</span>
                         <span className="text-[11px] text-slate-400">Otomatis jepret jika kamera mendeteksi pose 2 jari (Peace/V-Sign). Hanya bekerja jika Auto-Advance mati.</span>
                       </div>
                       <button
                         onClick={() => {
                           setGestureDetection(!gestureDetection);
                           if (!gestureDetection) setAutoAdvanceCountdown(false); // Matikan auto-advance jika gesture hidup
                         }}
                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${gestureDetection ? 'bg-indigo-600' : 'bg-slate-200'}`}
                       >
                         <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${gestureDetection ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                     </div>
                   </div>

                   <p className="px-2 text-[11px] text-slate-400 italic">
                     Catatan: Matikan fitur jika tidak ingin ditampilkan di halaman "Pilih Kanvas".
                   </p>

                   <div className="pt-4">
                     <button
                       onClick={handleSaveHardware}
                       className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-sm shrink-0"
                     >
                       Simpan Manajemen Fitur
                     </button>
                   </div>
                 </section>
               )}

               {activeTab === 'session' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                   <section className="space-y-5">
                     <div className="flex items-center justify-between mb-4">
                       <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sesi Foto</h2>
                     </div>

                     <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all hover:border-slate-200 hover:shadow-md">
                       <div className="flex items-start gap-4">
                         <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shrink-0 mt-0.5">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                         </div>
                         <div className="flex-1 min-w-0">
                           <label className="block text-sm font-bold text-slate-700 mb-1">Durasi Sesi (Detik)</label>
                           <p className="text-[11px] text-slate-400 mb-3">Tentukan waktu maksimal sekali sesi (misal 300 untuk 5 menit)</p>
                           <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={sessionTimeout}
                                onFocus={() => onInputFocus("sessionTimeout", sessionTimeout.toString())}
                                onChange={(e) => {
                                  setSessionTimeout(parseInt(e.target.value) || 0);
                                  if (keyboardRef.current && focusedInput === "sessionTimeout") keyboardRef.current.setInput(e.target.value);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition-all"
                              />
                              <span className="text-sm font-bold text-slate-400 shrink-0">≈ {Math.floor(sessionTimeout / 60)}m {sessionTimeout % 60}s</span>
                           </div>
                         </div>
                       </div>
                     </div>
                     <p className="px-2 text-[11px] text-slate-400 italic">
                        Catatan: Waktu ini akan digunakan saat mulai sesi foto baru setelah pembayaran.
                     </p>
                     
                     <div className="pt-2">
                       <button
                         onClick={handleSaveHardware}
                         className="w-full py-4 rounded-2xl font-bold bg-rose-600 text-white shadow-lg hover:bg-rose-700 transition-all font-black uppercase tracking-widest text-sm shrink-0"
                       >
                         Simpan Sesi
                       </button>
                     </div>
                   </section>

                   <hr className="border-slate-100" />

                   <section className="space-y-5">
                     <div className="flex items-center justify-between mb-4">
                       <h2 className="text-2xl font-black text-slate-800 tracking-tight">Antrean Upload</h2>
                     </div>

                     <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all hover:border-slate-200 hover:shadow-md">
                       <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center gap-2">
                           <span className="flex h-3 w-3 relative">
                             {uploadQueue.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                             <span className={`relative inline-flex rounded-full h-3 w-3 ${uploadQueue.length > 0 ? "bg-cyan-500" : "bg-slate-300"}`}></span>
                           </span>
                           <h3 className="text-sm font-bold text-slate-700">Tertunda: {uploadQueue.length} File</h3>
                         </div>
                         {uploadQueue.length > 0 && (
                           <button onClick={handleClearQueue} className="text-[10px] bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-200 transition-colors">
                             Kosongkan
                           </button>
                         )}
                       </div>
      
                       {uploadQueue.length > 0 ? (
                         <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                           {uploadQueue.map((task, idx) => (
                             <div key={task.key || idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                               <div>
                                 <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={task.transaction_id || task.key}>{task.transaction_id || task.key}</p>
                                 <p className="text-[10px] text-slate-500">Retry: {task.retry_count || 0}/3</p>
                               </div>
                               <div className="text-[10px] text-cyan-600 font-semibold bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100 animate-pulse">
                                 Menunggu...
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="py-6 flex flex-col items-center justify-center text-center">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                           </div>
                           <p className="text-xs font-medium text-slate-500">Semua tersinkronisasi</p>
                         </div>
                       )}
                     </div>
                   </section>
                 </div>
               )}
            </div>

          </div>
        )}
      </main>

      {/* Virtual Keyboard */}
      <div 
        className={`fixed bottom-0 left-0 w-full bg-slate-100 border-t border-slate-300 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 z-[100] ${
          focusedInput ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center px-6 py-2 bg-slate-200 border-b border-slate-300">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Virtual Keyboard</span>
          <button 
            onClick={() => setFocusedInput(null)}
            className="px-5 py-2 bg-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-400 transition-colors text-xs uppercase"
          >
            Tutup
          </button>
        </div>
        <div className="p-4 bg-slate-50 w-full text-black">
          <Keyboard
            keyboardRef={r => (keyboardRef.current = r)}
            layoutName={layoutName}
            onChange={onKeyboardChange}
            onKeyPress={onKeyboardKeyPress}
            theme={"hg-theme-default"}
          />
        </div>
      </div>

      {/* Custom animation */}
      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
