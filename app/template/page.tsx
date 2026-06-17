"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

interface TemplateItem {
  id: number;
  name: string;
  template_path: string;
  image_width: number;
  image_height: number;
  frame_count: number;
  category?: string; 
}

function TemplateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasType = searchParams.get("kanvas") || "koran";

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("SEMUA");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customBgImage, setCustomBgImage] = useState<string>("");

  useEffect(() => {
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
  }, []);

  // Timer States
  const [timeLeft, setTimeLeft] = useState(300);
  useEffect(() => {
    const savedTimeout = localStorage.getItem("sessionTimeout");
    if (savedTimeout) setTimeLeft(parseInt(savedTimeout, 10));
  }, []);
  const [showWarning, setShowWarning] = useState(false);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);

  // Timer Effect
  useEffect(() => {
    const storedExpiry = localStorage.getItem("session_expiry");
    let expiry = storedExpiry ? parseInt(storedExpiry, 10) : 0;
    
    if (!expiry || isNaN(expiry)) {
      const savedTimeout = localStorage.getItem("sessionTimeout");
      const timeout = savedTimeout ? parseInt(savedTimeout, 10) : (Number(process.env.NEXT_PUBLIC_SESSION_TIMEOUT) || 300);
      expiry = Date.now() + timeout * 1000;
      localStorage.setItem("session_expiry", expiry.toString());
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setShowTimeoutAlert(true);
        setTimeout(() => {
          router.push("/"); 
        }, 3500);
      }

      if (remaining === 60 && !showWarning) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [router, showWarning]);

  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem("templates");
      const storedBaseUrl = localStorage.getItem("templates_base_url");

      if (storedTemplates) {
        const parsed = JSON.parse(storedTemplates) as TemplateItem[];
        setTemplates(parsed);
        setBaseUrl(storedBaseUrl || "");
        if (parsed.length > 0) {
          setSelectedTemplate(parsed[0].id);
        }
      } else {
        setError("Data template tidak ditemukan. Silakan lakukan pembayaran ulang.");
      }
    } catch (err) {
      setError("Gagal memuat data template.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter templates by category
  const categories = ["SEMUA", ...Array.from(new Set(templates.map(t => t.category || "LAINNYA").filter(cat => cat !== undefined)))];
  
  const filteredTemplates = selectedCategory === "SEMUA" 
    ? templates 
    : templates.filter(t => (t.category || "LAINNYA") === selectedCategory);

  const handleNext = () => {
    if (!selectedTemplate) return;
    const tpl = templates.find(t => t.id === selectedTemplate);
    const frames = tpl?.frame_count || 1;
    
    if (canvasType === "flipbook") {
      router.push(`/flipbook-camera?kanvas=${canvasType}&template=${selectedTemplate}&frames=${frames}&time=${timeLeft}`);
    } else {
      router.push(`/camera?kanvas=${canvasType}&template=${selectedTemplate}&frames=${frames}&time=${timeLeft}`);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${cleanBaseUrl}/storage/${cleanPath}`;
  };

  return (
    <div className="relative h-screen w-full overflow-hidden p-4 font-sans text-slate-900 flex flex-col" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}

      {/* Main Container */}
      <div className="relative flex-1 flex flex-col rounded-[30px] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.1)] z-10">
        
        {/* Header Title */}
        <div className="w-full text-center py-4 shrink-0">
          <h1 className={`${poppins.className} text-white text-2xl uppercase tracking-[0.2em] drop-shadow-md font-bold`}>
            PILIH FRAME
          </h1>
        </div>

        {/* Content - Responsive Layout */}
        <div className="flex-1 flex flex-col portrait:flex-col landscape:flex-row gap-4 px-4 pb-4 overflow-hidden">
          
          {/* Left Panel - GRUB FRAME (Categories) */}
          <div className="w-full landscape:w-64 bg-white rounded-[24px] flex landscape:flex-col p-3 landscape:p-4 overflow-hidden shadow-2xl shrink-0">
             <h2 className={`${poppins.className} text-black text-sm landscape:mb-4 portrait:mb-0 portrait:mr-3 portrait:flex portrait:items-center uppercase text-center tracking-wider font-bold shrink-0 whitespace-nowrap`}>
                GRUB FRAME
             </h2>
             
             <div className="flex-1 flex portrait:flex-row landscape:flex-col gap-2 landscape:gap-3 portrait:overflow-x-auto landscape:overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {categories.map((cat) => (
                   <button
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={`
                       shrink-0 px-3 py-2 landscape:px-4 landscape:py-4 rounded-xl border-2 transition-all duration-300 text-center flex items-center justify-center landscape:min-h-[80px]
                       ${selectedCategory === cat 
                         ? "bg-black border-black text-white shadow-lg" 
                         : "bg-white border-black text-black hover:bg-gray-50/50"
                       }
                     `}
                   >
                     <span className="font-black uppercase tracking-tight text-[10px] leading-tight whitespace-nowrap">
                       {cat}
                     </span>
                   </button>
                ))}
             </div>
          </div>

          {/* Right Panel - FRAME LIST */}
          <div className="flex-1 bg-white rounded-[24px] flex flex-col p-4 overflow-hidden shadow-2xl relative">
              <h2 className={`${poppins.className} text-black text-sm mb-4 uppercase tracking-wider font-bold`}>
                FRAME
              </h2>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                  <div className="w-16 h-16 border-8 border-black/20 border-t-black rounded-full animate-spin"></div>
                  <p className="font-black text-slate-300 uppercase tracking-widest">MEMUAT FRAME...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center flex-1 text-rose-500 font-bold bg-rose-50 rounded-3xl p-10 text-center">
                   <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"/></svg>
                   <p className="text-lg">{error}</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 portrait:grid-cols-2 landscape:grid-cols-3 gap-4 auto-rows-max custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
                  {filteredTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`
                        relative group flex flex-col items-center p-3 rounded-2xl border-[3px] transition-all duration-500
                        ${selectedTemplate === tpl.id 
                          ? "border-black bg-gray-50/30 shadow-xl" 
                          : "border-slate-100 hover:border-gray-200"
                        }
                      `}
                    >
                      <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-50 mb-3 relative shadow-inner">
                        <img 
                          src={getImageUrl(tpl.template_path)} 
                          alt={tpl.name}
                          className={`w-full h-full object-contain p-2 transition-transform duration-700 ${selectedTemplate === tpl.id ? 'scale-105' : 'group-hover:scale-105'}`}
                        />
                        {selectedTemplate === tpl.id && (
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-black text-white rounded-full p-2 shadow-2xl border-4 border-white animate-in zoom-in duration-300">
                               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className={`font-black text-[10px] uppercase truncate w-full px-1 ${selectedTemplate === tpl.id ? 'text-black' : 'text-slate-500'}`}>
                        {tpl.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Horizontal Slider Line Visual */}
              <div className="mt-4 relative h-6 flex items-center shrink-0">
                 <div className="w-full h-1.5 bg-black rounded-full relative">
                    <div className="absolute top-1/2 left-[40%] -translate-y-1/2 w-8 h-3 bg-black rounded-sm border-2 border-white shadow-xl"></div>
                 </div>
              </div>
          </div>

        </div>

        {/* Floating Action Button */}
        <div className="absolute bottom-6 right-6 z-20">
            <button
               onClick={handleNext}
               disabled={!selectedTemplate}
               className={`
                 ${poppins.className} flex items-center gap-2 px-8 py-3 rounded-lg text-white text-lg shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all duration-500 transform
                 ${selectedTemplate 
                    ? "bg-black hover:bg-gray-800 hover:scale-105 active:scale-95" 
                    : "bg-slate-300 cursor-not-allowed grayscale"
                 }
               `}
            >
               LANJUT
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>

        {/* Timer floating badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/40 shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
          <span className="text-white font-black tabular-nums tracking-widest text-sm">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>

      </div>

      {showWarning && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-10 py-5 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-in slide-in-from-top-20 duration-500 border-4 border-black">
           <div className="p-2 bg-black text-white rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
           </div>
           <span className={`${poppins.className} text-xl uppercase font-black`}>Sisa 1 Menit!</span>
        </div>
      )}

      {/* Session Timeout Alert Modal */}
      {showTimeoutAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-white rounded-[40px] p-12 w-full max-w-md shadow-2xl border-[8px] border-black flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-gray-100 text-black rounded-full flex items-center justify-center mb-8 animate-bounce">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              </div>
              <h3 className={`${poppins.className} text-3xl text-slate-900 mb-4 uppercase font-black`}>SESI BERAKHIR</h3>
              <p className="font-bold text-slate-500 text-lg leading-relaxed mb-4">
                 Mohon maaf, waktu sesi Anda telah habis.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-4">
                 <div className="bg-black h-full animate-[progress_3.5s_linear_forwards]"></div>
              </div>
              <p className="text-xs text-slate-400 mt-4 uppercase font-black tracking-widest">Kembali ke Beranda...</p>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function TemplateSelection() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <div className="w-20 h-20 border-8 border-black border-t-transparent rounded-full animate-spin"></div>
           <p className={`${poppins.className} text-black text-xl animate-pulse font-bold`}>LOADING...</p>
        </div>
      </div>
    }>
      <TemplateContent />
    </Suspense>
  );
}
