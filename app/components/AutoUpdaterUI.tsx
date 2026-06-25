"use client";

import React, { useEffect, useState } from "react";
import { DownloadCloud, CheckCircle2, AlertTriangle, RefreshCw, X } from "lucide-react";

export default function AutoUpdaterUI() {
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "available" | "downloading" | "downloaded" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run in Electron environment
    if (typeof window !== "undefined" && (window as any).electron?.onUpdateMessage) {
      (window as any).electron.onUpdateMessage((message: any) => {
        const { type, data } = message;

        if (type === "checking-for-update") {
          // You might not want to show UI just for checking unless user clicked a button
          // But for now let's keep it silent or brief
        } else if (type === "update-available") {
          setUpdateState("available");
          setVisible(true);
        } else if (type === "download-progress") {
          setUpdateState("downloading");
          setVisible(true);
          setProgress(data.percent || 0);
          setSpeed((data.bytesPerSecond / 1024 / 1024).toFixed(2) + " MB/s");
        } else if (type === "update-downloaded") {
          setUpdateState("downloaded");
          setVisible(true);
        } else if (type === "error") {
          setUpdateState("error");
          setErrorMsg(data || "Unknown Error");
          setVisible(true);
        }
      });
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-80 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          {updateState === "downloading" && <><DownloadCloud className="w-4 h-4 text-blue-500 animate-pulse" /> Mengunduh Pembaruan</>}
          {updateState === "downloaded" && <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pembaruan Siap</>}
          {updateState === "error" && <><AlertTriangle className="w-4 h-4 text-rose-500" /> Gagal Memperbarui</>}
          {updateState === "available" && <><RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Pembaruan Ditemukan</>}
        </h3>
        <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {updateState === "downloading" && (
        <div className="space-y-2 mt-3">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>{Math.round(progress)}%</span>
            <span>{speed}</span>
          </div>
        </div>
      )}

      {updateState === "downloaded" && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-3">Versi baru aplikasi telah siap. Silakan instal untuk menerapkan fitur baru.</p>
          <button 
            onClick={() => (window as any).electron?.installUpdate()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/30"
          >
            Mulai Ulang & Pasang
          </button>
        </div>
      )}

      {updateState === "error" && (
        <div className="mt-2 p-2 bg-rose-50 rounded-lg">
          <p className="text-[10px] text-rose-600 font-mono break-all">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
