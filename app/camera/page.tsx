"use client";



import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import localforage from "localforage";

import { Poppins } from "next/font/google";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";



const poppins = Poppins({

  subsets: ["latin"],

  weight: ["400", "600", "700", "900"],

});



interface TemplateFrame {

  x: number;

  y: number;

  width: number;

  height: number;

}



interface TemplateItem {

  id: number;

  name: string;

  template_path: string;

  image_width: number;

  image_height: number;

  frame_count: number;

  frames?: TemplateFrame[];

}



function CameraContent() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const canvasType = searchParams.get("kanvas") || "koran";

  const templateId = searchParams.get("template") || "1";

  const totalFrames = Number(searchParams.get("frames")) || 4;



  // Template Data

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);



  const [streamReady, setStreamReady] = useState(0);
  const [isDigiCamLive, setIsDigiCamLive] = useState(false);
  const [liveViewUrl, setLiveViewUrl] = useState<string>("");

  const digiCamLoopRef = useRef<number | null>(null);

  const liveViewCanvasRef = useRef<HTMLCanvasElement>(null);



  const [template, setTemplate] = useState<TemplateItem | null>(null);

  const [baseUrl, setBaseUrl] = useState("");



  // Camera & Photo States

  const videoRef = useRef<HTMLVideoElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const videoChunksRef = useRef<BlobPart[]>([]);



  const [currentFrame, setCurrentFrame] = useState(0);

  const [photos, setPhotos] = useState<(string | null)[]>(Array(totalFrames).fill(null));

  const [videos, setVideos] = useState<(Blob | null)[]>(Array(totalFrames).fill(null));

  const recorderRef = useRef<MediaRecorder | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const currentFrameRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);

  const [countdown, setCountdown] = useState<number | null>(null);

  const [isMirrored, setIsMirrored] = useState(true);



  useEffect(() => {

    currentFrameRef.current = currentFrame;

  }, [currentFrame]);

  const [flashActive, setFlashActive] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const [customBgImage, setCustomBgImage] = useState<string>("");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [gestureDetect, setGestureDetect] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(3);

  useEffect(() => {
    try {
        const savedPrinter = localStorage.getItem("selectedPrinter");
        // if (savedPrinter) setSelectedPrinter(savedPrinter);
        const digiCamStatus = localStorage.getItem("digiCamLiveView") === "true";
        setIsDigiCamLive(digiCamStatus);
      } catch (e) { }
    const savedBg = localStorage.getItem("welcomeBgImage");
    if (savedBg) {
      setCustomBgImage(savedBg);
    }
    
    const savedAutoAdvance = localStorage.getItem("autoAdvanceCountdown") === "true";
    setAutoAdvance(savedAutoAdvance);
    
    const savedGesture = localStorage.getItem("gestureDetection") === "true";
    setGestureDetect(savedGesture);
    
    const savedCountdown = localStorage.getItem("countdownDuration");
    if (savedCountdown) setCountdownDuration(parseInt(savedCountdown, 10));
  }, []);

  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const gestureHistoryRef = useRef<boolean[]>([]);

  useEffect(() => {
    if (!gestureDetect) return;

    let isMounted = true;
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        if (isMounted) {
          setHandLandmarker(landmarker);
          console.log("HandLandmarker loaded");
        }
      } catch (e) {
        console.error("Failed to load hand landmarker", e);
      }
    };
    initLandmarker();
    
    return () => { isMounted = false; };
  }, [gestureDetect]);

  // Gesture Detection Loop
  useEffect(() => {
    if (!gestureDetect || !handLandmarker || countdown !== null || showPreview) {
      gestureHistoryRef.current = [];
      return;
    }

    let animationFrameId: number;

    const detectGesture = () => {
      let sourceElement: HTMLVideoElement | HTMLCanvasElement | null = null;
      let startTimeMs = performance.now();

      if (isDigiCamLive && liveViewCanvasRef.current) {
        sourceElement = liveViewCanvasRef.current;
      } else if (!isDigiCamLive && videoRef.current && videoRef.current.readyState >= 2) {
        sourceElement = videoRef.current;
        if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = videoRef.current.currentTime;
        } else {
           animationFrameId = requestAnimationFrame(detectGesture);
           return;
        }
      }

      if (sourceElement && handLandmarker) {
        try {
          const results = handLandmarker.detectForVideo(sourceElement, startTimeMs);
          let isVSign = false;

          if (results.landmarks && results.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
              // V-Sign logic: Index & Middle up, Ring & Pinky down
              // In camera coordinates, y=0 is top. So lower y means finger is extended up.
              const indexUp = landmarks[8].y < landmarks[6].y && landmarks[8].y < landmarks[5].y;
              const middleUp = landmarks[12].y < landmarks[10].y && landmarks[12].y < landmarks[9].y;
              const ringDown = landmarks[16].y > landmarks[14].y;
              const pinkyDown = landmarks[20].y > landmarks[18].y;

              if (indexUp && middleUp && ringDown && pinkyDown) {
                isVSign = true;
                break;
              }
            }
          }

          // Require 10 consecutive positive frames to trigger
          gestureHistoryRef.current.push(isVSign);
          if (gestureHistoryRef.current.length > 10) gestureHistoryRef.current.shift();

          const trigger = gestureHistoryRef.current.length === 10 && gestureHistoryRef.current.every(v => v);

          if (trigger) {
            console.log("V-Sign Detected! Triggering Capture.");
            gestureHistoryRef.current = []; // reset
            setCountdown(countdownDuration);
            return; // stop detection loop while countdown runs
          }
        } catch (e) {
          // ignore detection errors
        }
      }

      animationFrameId = requestAnimationFrame(detectGesture);
    };

    detectGesture();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gestureDetect, handLandmarker, countdown, showPreview, isDigiCamLive]);


  const [frameEdits, setFrameEdits] = useState<Record<number, any>>({});

  const currentEdit = frameEdits[currentFrame] || { brightness: 0, contrast: 0, activeFilter: "normal" };



  // Timer States

  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {

    const savedTimeout = localStorage.getItem("sessionTimeout");

    if (savedTimeout) setTimeLeft(parseInt(savedTimeout, 10));

  }, []);

  const [showWarning, setShowWarning] = useState(false);

  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);



  // Load Template & Data

  useEffect(() => {

    try {

      const storedTemplates = localStorage.getItem("templates");

      const storedBaseUrl = localStorage.getItem("templates_base_url") || "";

      setBaseUrl(storedBaseUrl);



      if (storedTemplates) {

        const parsed = JSON.parse(storedTemplates) as TemplateItem[];

        const found = parsed.find(t => t.id.toString() === templateId);

        if (found) setTemplate(found);

      }



      const storedRaw = localStorage.getItem("rawPhotos");

      const storedEdits = localStorage.getItem("frameEdits");

      if (storedRaw) {

        const parsedRaw = JSON.parse(storedRaw);

        if (Array.isArray(parsedRaw) && parsedRaw.length === totalFrames) setPhotos(parsedRaw);

      }

      if (storedEdits) setFrameEdits(JSON.parse(storedEdits));

    } catch (e) { console.error(e); }

  }, [templateId, totalFrames]);



  // Session Timer Engine

  useEffect(() => {

    const storedExpiry = localStorage.getItem("session_expiry");

    let expiry = storedExpiry ? parseInt(storedExpiry, 10) : 0;

    if (!expiry) { router.push("/"); return; }



    const timer = setInterval(() => {

      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));

      setTimeLeft(remaining);

      if (remaining <= 0) { 

        clearInterval(timer); 

        stopCamera(); 

        setShowTimeoutAlert(true);

        setTimeout(() => {

          router.push("/"); 

        }, 3500);

      }

      if (remaining === 60 && !showWarning) { setShowWarning(true); setTimeout(() => setShowWarning(false), 5000); }

    }, 1000);

    return () => clearInterval(timer);

  }, [router, showWarning, canvasType]);



  const updateEdit = (key: string, value: any) => {

    setFrameEdits((prev) => ({

      ...prev,

      [currentFrame]: { ...currentEdit, [key]: value },

    }));

  };



  const startCamera = useCallback(async () => {
    const initStream = (stream: MediaStream) => {
      streamRef.current = stream;
      setStreamReady(Date.now()); // Force re-render instantly
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          if (streamRef.current) {
            try {
              let options: any = { mimeType: 'video/webm' };
              if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')) {
                options = { mimeType: 'video/mp4; codecs="avc1.42E01E"' };
              } else if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
                options = { mimeType: 'video/webm; codecs=h264' };
              }
              recorderRef.current = new MediaRecorder(streamRef.current, options);
              recorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
              };
              recorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setVideos(prev => {
                  const newVids = [...prev];
                  newVids[currentFrameRef.current] = blob;
                  return newVids;
                });
                chunksRef.current = [];
              };
            } catch (e) {
              console.error("Failed to init MediaRecorder", e);
            }
          }
        };
        videoRef.current.play().catch(() => { });
      }
    };

    try {
      const digiCamLiveMode = localStorage.getItem("digiCamLiveView") === "true";

      if (digiCamLiveMode) {
        // Mode DSLR (Nikon/Canon) via digiCamControl Polling
        console.log("Memulai Live View DSLR (Polling)...");
        
        let isRunning = true;
        const liveCanvas = liveViewCanvasRef.current;
        (window as any)._stopDigiCamLoop = () => { isRunning = false; };
        
        let latestImg: HTMLImageElement | null = null;
        
        // Render loop untuk memaksa canvas update 60fps agar captureStream(30) stabil
        // Mencegah video WebM ter-fast-forward 3x lipat akibat frame drop
        const renderCanvasLoop = () => {
          if (!isRunning) return;
          if (liveCanvas && latestImg && latestImg.width > 0) {
            if (liveCanvas.width !== latestImg.width || liveCanvas.height !== latestImg.height) {
              liveCanvas.width = latestImg.width;
              liveCanvas.height = latestImg.height;
            }
            const ctx = liveCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(latestImg, 0, 0);
              // Force invisible change every frame to prevent Chrome from dropping identical frames (causing super fast playback bug)
              ctx.fillStyle = `rgb(${Date.now() % 255}, 0, 0)`;
              ctx.fillRect(0, 0, 1, 1);
            }
            if (!streamRef.current) {
              const stream = liveCanvas.captureStream(30);
              initStream(stream);
            }
          }
          if (isRunning) requestAnimationFrame(renderCanvasLoop);
        };
        requestAnimationFrame(renderCanvasLoop);

        const loop = async () => {
          if (!isRunning) return;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`/api/camera/liveview?t=${Date.now()}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
              const blob = await res.blob();
              if (blob.size > 500) { 
                const url = URL.createObjectURL(blob);
                
                setLiveViewUrl(old => {
                  if (old) URL.revokeObjectURL(old);
                  return url;
                });
                
                const img = new Image();
                img.onload = () => {
                  latestImg = img;
                };
                img.src = url;
              }
            }
          } catch (e) {
            // Abaikan error timeout/koneksi
          }
          
          if (isRunning) {
            digiCamLoopRef.current = setTimeout(loop, 60) as unknown as number; // Polling kamera
          }
        };
        
        loop();

      } else {
        // --- STANDARD WEBCAM MODE ---
        const preferredCameraId = localStorage.getItem("preferredCameraId");
        const constraints: MediaStreamConstraints = {
          video: preferredCameraId && preferredCameraId !== "USB Video" ? { deviceId: { exact: preferredCameraId } } : true,
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        initStream(stream);
      }

    } catch (e) {
      // Basic Fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        initStream(stream);
      } catch (err) { console.error(err); }
    }
  }, []);



  const stopCamera = useCallback(() => {
    if ((window as any)._stopDigiCamLoop) {
      (window as any)._stopDigiCamLoop();
      (window as any)._stopDigiCamLoop = null;
    }
    if (digiCamLoopRef.current) {
      cancelAnimationFrame(digiCamLoopRef.current);
      digiCamLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);



  useEffect(() => {

    startCamera();

    return () => stopCamera();

  }, [startCamera, stopCamera]);



  const capturePhoto = async () => {

    if (!videoRef.current || !canvasRef.current) return;

    // Stop MediaRecorder immediately to grab the perfect 3-second countdown video
    // before the camera freezes or the native capture API causes a delay.
    if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
      recorderRef.current.stop();
    }
    
    // Trigger UI screen flash instantly
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    const nativeDslrEnabled = localStorage.getItem("nativeDslrCapture") === "true";
    let nativePhotoImg: HTMLImageElement | null = null;

    if (nativeDslrEnabled) {
      try {
        const res = await fetch('/api/camera/capture', { method: 'POST' });
        const json = await res.json();
        if (json.success && json.photoUrl) {
          nativePhotoImg = new Image();
          await new Promise((resolve, reject) => {
            if (!nativePhotoImg) return reject();
            nativePhotoImg.onload = resolve;
            nativePhotoImg.onerror = () => {
              console.warn("Gagal memuat gambar High-Res, menggunakan Live View snapshot.");
              nativePhotoImg = null;
              resolve(null); // Jangan reject, biarkan fallback bekerja
            };
            nativePhotoImg.src = json.photoUrl;
          });
        } else if (!json.success) {
          console.warn("Capture API:", json.message || "Gagal, menggunakan fallback.");
        }
        // Jika json.success tapi photoUrl null, diam saja — fallback canvas akan bekerja
      } catch (err) {
        console.warn("Capture API tidak tersedia, menggunakan Live View snapshot.");
      }
    }

    const isDigiCamLive = localStorage.getItem("digiCamLiveView") === "true";
    const liveCanvas = liveViewCanvasRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    let sourceW = 0;
    let sourceH = 0;
    let drawableSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null = null;

    if (nativePhotoImg && nativePhotoImg.width > 0 && nativePhotoImg.height > 0) {
      sourceW = nativePhotoImg.width;
      sourceH = nativePhotoImg.height;
      drawableSource = nativePhotoImg;
    } else if (isDigiCamLive && liveCanvas && liveCanvas.width > 0 && liveCanvas.height > 0) {
      // Validasi bahwa canvas benar-benar ada pixel yang digambar (bukan canvas kosong)
      const checkCtx = liveCanvas.getContext('2d');
      if (checkCtx) {
        const sample = checkCtx.getImageData(0, 0, 1, 1).data;
        // Jika pixel pertama sepenuhnya hitam (r=0,g=0,b=0,a=0), kemungkinan canvas belum digambar
        if (sample[3] === 0) {
          console.warn("LiveView canvas kosong, menunggu frame berikutnya...");
          // Tunggu sebentar agar polling live view sempat menggambar frame
          await new Promise(r => setTimeout(r, 200));
        }
      }
      sourceW = liveCanvas.width;
      sourceH = liveCanvas.height;
      drawableSource = liveCanvas;
    } else if (video.videoWidth > 0 && video.videoHeight > 0) {
      sourceW = video.videoWidth;
      sourceH = video.videoHeight;
      drawableSource = video;
    }

    if (!sourceW || !sourceH || !drawableSource) {
      console.error("No valid source to capture photo from. sourceW:", sourceW, "sourceH:", sourceH);
      return;
    }

    canvas.width = sourceW;
    canvas.height = sourceH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    
    // Native capture usually doesn't have black bars. Video screenshot gets hardware crop zoom.
    const effectiveZoom = (nativePhotoImg || isDigiCamLive) ? 1.0 : 1.20;
    
    const sw = w / effectiveZoom;
    const sh = h / effectiveZoom;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;

    if (isMirrored) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(drawableSource, sx, sy, sw, sh, 0, 0, w, h);

    if (isMirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    // Validasi hasil canvas — pastikan bukan gambar hitam/kosong
    const checkPixel = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
    const isBlack = checkPixel[0] === 0 && checkPixel[1] === 0 && checkPixel[2] === 0;
    if (isBlack) {
      // Coba cek sudut lain jika tengahnya hitam (mungkin objek di tengah saja yang hitam)
      const edgePixel = ctx.getImageData(Math.floor(w / 4), Math.floor(h / 4), 1, 1).data;
      if (edgePixel[0] === 0 && edgePixel[1] === 0 && edgePixel[2] === 0) {
        console.error("Captured photo is entirely black! Discarding.");
        // We removed the return statement to allow the process to continue even if black
      }
    }
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    
    // Validasi ukuran data URL — gambar hitam biasanya sangat kecil
    if (dataUrl.length < 1000) {
      console.error("Captured photo data too small (", dataUrl.length, "chars), likely black. Discarding.");
      return;
    }
    
    setPhotos((prev) => {
      const u = [...prev];
      u[currentFrame] = dataUrl;
      return u;
    });

    setShowPreview(true);

  };



  useEffect(() => {
    if (showPreview && autoAdvance) {
      const allDone = photos.every((p) => p !== null);
      if (!allDone) {
        const timer = setTimeout(() => {
          handleNext(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
      // Jika semua frame sudah terisi (allDone = true), hentikan Auto-Advance!
      // Beri kesempatan pengguna untuk me-review hasil akhir, klik "ULANGI", atau klik "SELESAI" secara manual.
    }
  }, [showPreview, autoAdvance, photos]);

  const handleNext = async (autoTrigger = false) => {

    setShowPreview(false);

    const allDone = photos.every((p) => p !== null);

    if (allDone) {

      stopCamera();

      // Apply filters for final save

      const finalPhotos = await Promise.all(photos.map((raw, i) => {

        if (!raw) return null;

        return new Promise<string>((resolve) => {

          const img = new Image();

          img.onload = () => {

            const canvas = document.createElement("canvas");

            canvas.width = img.width; canvas.height = img.height;

            const ctx = canvas.getContext("2d");

            if (ctx) {

              ctx.filter = getFilterStyle(frameEdits[i] || { brightness: 0, contrast: 0, activeFilter: "normal" });

              ctx.drawImage(img, 0, 0);

            }

            resolve(canvas.toDataURL("image/jpeg", 0.95));

          };

          img.onerror = () => {
            console.error(`Failed to load photo ${i} for filter processing, using raw`);
            resolve(raw); // Fallback: gunakan foto mentah tanpa filter daripada hilang
          };

          img.src = raw;

        });

      }));



      localStorage.setItem("rawPhotos", JSON.stringify(photos));

      localStorage.setItem("frameEdits", JSON.stringify(frameEdits));

      localStorage.setItem("capturedPhotos", JSON.stringify(finalPhotos));

      await localforage.setItem("liveVideos", videos);

      router.push(`/render?kanvas=${canvasType}&template=${templateId}&time=${timeLeft}`);

    } else {

      const nextEmpty = photos.findIndex((p, i) => i > currentFrame && p === null);

      const firstEmpty = photos.findIndex((p) => p === null);

      setCurrentFrame(nextEmpty !== -1 ? nextEmpty : firstEmpty);
      
      if (autoTrigger) {
        setCountdown(countdownDuration);
      }

    }

  };



  const handleRetake = () => {

    setPhotos((prev) => { const u = [...prev]; u[currentFrame] = null; return u; });

    setVideos((prev) => { const u = [...prev]; u[currentFrame] = null; return u; });

    setShowPreview(false);
    
    if (autoAdvance) {
      setCountdown(countdownDuration);
    }

  };



  const getFilterStyle = (editState?: any) => {

    const state = editState || currentEdit;

    const b = 100 + state.brightness;

    const c = 100 + state.contrast;

    let extra = "";

    switch (state.activeFilter) {

      case "bw": extra = " grayscale(100%)"; break;

      case "sepia": extra = " sepia(100%)"; break;

      case "vintage": extra = " sepia(50%) contrast(90%) brightness(110%) hue-rotate(-10deg)"; break;

      case "cinematic": extra = " contrast(120%) saturate(130%) brightness(95%)"; break;

      case "portrait": extra = " brightness(110%) saturate(110%) contrast(95%)"; break;

      case "vibrant": extra = " saturate(150%) contrast(110%)"; break;

      case "fade": extra = " contrast(85%) brightness(110%) saturate(80%)"; break;

    }

    return `brightness(${b}%) contrast(${c}%)${extra}`;

  };



  useEffect(() => {

    if (countdown === null) return;

    if (countdown === countdownDuration) {
      // Start recording fresh at the beginning of countdown (any duration: 3, 5, or 10)
      if (recorderRef.current && recorderRef.current.state === "inactive") {
        chunksRef.current = [];
        try {
          recorderRef.current.start(100);
        } catch (e) {
          console.error("Failed to start recording", e);
        }
      }
    }

    if (countdown === 0) { capturePhoto(); setCountdown(null); return; }

    const t = setTimeout(() => setCountdown(p => p !== null ? p - 1 : null), 1000);

    return () => clearTimeout(t);

  }, [countdown, countdownDuration]);



  const getImageUrl = (path: string) => {
    if (!path) return "";
    let url = path;
    if (!path.startsWith("http")) {
      const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      url = `${cleanBaseUrl}/storage/${cleanPath}`;
    }
    return `/api/cache-image?url=${encodeURIComponent(url)}`;
  };



  const filters = [

    { id: "normal", color: "bg-slate-300", label: "Normal" },

    { id: "bw", color: "bg-slate-800", label: "B&W" },

    { id: "sepia", color: "bg-[#704214]", label: "Sepia" },

    { id: "vintage", color: "bg-[#d4b595]", label: "Vintage" },

    { id: "cinematic", color: "bg-teal-700", label: "Cine" },

    { id: "vibrant", color: "bg-fuchsia-500", label: "Vibrant" },

  ];



  return (

    <div className="relative h-screen w-full overflow-hidden p-2 sm:p-3 font-sans text-slate-900 flex flex-col" style={{ backgroundImage: customBgImage ? `url(${customBgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {!customBgImage && (
        <>
          {/* Background decoration */}
          <div className="fixed top-[-20%] right-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
          <div className="fixed bottom-[-20%] left-[-15%] h-[50%] w-[50%] rounded-full bg-gray-100/30 blur-[150px] pointer-events-none z-0" />
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />



      {/* Main Container border white */}
      <div className="relative flex-1 flex flex-col rounded-[30px] overflow-hidden min-h-0 z-10">
        <div className="shrink-0 flex justify-center py-2 relative px-6">
          <button
            onClick={() => setShowBackConfirm(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-2 border-white/50 px-4 py-1.5 rounded-lg font-black text-[9px] tracking-[0.15em] transition-all active:scale-95 flex items-center gap-1.5 drop-shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            GANTI TEMPLATE
          </button>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-white/50 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-white font-black text-sm tabular-nums tracking-wider drop-shadow-md">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>



        <main className="flex-1 flex flex-col gap-3 px-4 pb-4 min-h-0 overflow-hidden">

          <div className="flex-1 flex flex-row gap-4 min-h-0 overflow-hidden">
            
            {/* LEFT: RAW CAMERA PREVIEW */}
            <div className="flex-[1.8] flex flex-col min-h-0 min-w-0 bg-white rounded-[20px] shadow-2xl p-4 relative overflow-hidden border-3 border-white gap-4">
              
              <div className="flex items-center justify-center relative shrink-0">
                <h2 className={`${poppins.className} text-slate-800 text-base sm:text-lg uppercase tracking-widest font-bold`}>
                  LIVE CAMERA
                </h2>
              </div>

              {/* Hidden video and canvas for capture & stream functions */}
              <div className="absolute opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={liveViewCanvasRef} />
              </div>

              <div className="flex-1 min-h-0 w-full relative bg-slate-100 rounded-[14px] overflow-hidden flex items-center justify-center shadow-inner border border-slate-200">
                 {!showPreview ? (
                    isDigiCamLive ? (
                      liveViewUrl ? (
                        <img
                          src={liveViewUrl}
                          className="absolute inset-0 w-full h-full"
                          style={{ objectFit: 'contain', transform: `scaleX(${isMirrored ? -1 : 1})`, filter: getFilterStyle() }}
                          alt="Live View"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <div className="animate-pulse text-slate-400 text-sm font-medium">Menghubungkan kamera...</div>
                        </div>
                      )
                    ) : (
                      <video
                        key={`video-stream-${streamReady}`}
                        autoPlay playsInline muted
                        className="absolute inset-0 w-full h-full"
                        style={{ objectFit: 'cover', transform: `scaleX(${isMirrored ? -1 : 1})`, filter: getFilterStyle() }}
                        ref={(el) => {
                          if (el && streamRef.current && el.srcObject !== streamRef.current) {
                            el.srcObject = streamRef.current;
                            el.play().catch(() => {});
                          }
                        }}
                      />
                    )
                 ) : (
                    <img 
                      src={photos[currentFrame]!} 
                      className="absolute inset-0 w-full h-full" 
                      style={{ objectFit: 'contain', filter: getFilterStyle(frameEdits[currentFrame]) }}
                      alt="Captured Preview"
                    />
                 )}

                 {/* Countdown Overlay */}
                 {countdown !== null && (
                   <div className="absolute inset-0 flex items-center justify-center z-30">
                     <span className={`${poppins.className} text-[8rem] lg:text-[12rem] text-white drop-shadow-2xl animate-ping font-black`}>{countdown}</span>
                   </div>
                 )}

                 {/* Flash Overlay */}
                 {flashActive && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300"></div>}
              </div>

              {/* Camera Buttons Row Inside Card */}
              <div className="shrink-0 flex items-center justify-center gap-4 w-full pt-2">
                {!showPreview ? (
                  <>
                    <button
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-95 border-3
                        ${isMirrored ? "bg-black text-white border-white" : "bg-white/90 text-black border-slate-200"}`}
                      title="Mirror Camera"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/></svg>
                    </button>

                    <button
                      onClick={() => { if (cameraReady && countdown === null && recorderRef.current?.state !== "recording") setCountdown(countdownDuration); }}
                      className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-md border-[6px] border-black flex items-center justify-center text-black shadow-2xl hover:scale-110 active:scale-95 transition-all group relative"
                    >
                      <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white transition-colors group-hover:bg-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                      </div>
                    </button>

                    {/* Spacer for balancing the mirror button */}
                    <div className="w-14 h-14"></div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-4 w-full max-w-sm bg-slate-100 p-3 rounded-2xl border-2 border-slate-200 shadow-xl">
                    <button
                      onClick={handleRetake}
                      className="flex-1 h-12 rounded-xl bg-black text-white font-black text-sm tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase border-2 border-white/30"
                    >
                      ULANGI
                    </button>
                    <button
                      onClick={() => handleNext(false)}
                      className="flex-1 h-12 rounded-xl bg-black text-white font-black text-sm tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase border-2 border-white/30"
                    >
                      {photos.every((p) => p !== null) ? "SELESAI" : "LANJUT"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: TEMPLATE PREVIEW */}
            <div className="flex-[1] flex flex-col min-h-0 min-w-0 bg-white rounded-[20px] shadow-2xl p-4 relative overflow-hidden border-3 border-white items-center justify-center gap-4">
              
              <div className="flex items-center justify-center relative shrink-0">
                <h2 className={`${poppins.className} text-slate-800 text-base sm:text-lg uppercase tracking-widest font-bold`}>
                  TEMPLATE
                </h2>
              </div>

              <div className="flex-1 min-h-0 w-full flex items-center justify-center relative bg-slate-50 rounded-2xl border border-slate-200 p-2 shadow-inner">
                {template ? (
                  <div
                    className="relative shadow-lg overflow-hidden bg-white border-2 border-slate-300"
                    style={{
                      height: '100%',
                      aspectRatio: `${template.image_width}/${template.image_height}`
                    }}
                  >
                    {/* Captured Photos Layer */}
                    {(template as any).frames?.map((frame: any, i: number) => {
                      const photo = photos[i];
                      const isCurrent = i === currentFrame;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setCurrentFrame(i);
                            if (photos[i]) setShowPreview(true);
                            else setShowPreview(false);
                          }}
                          className={`absolute overflow-hidden flex items-center justify-center transition-all duration-500 cursor-pointer pointer-events-auto
                            ${photo ? "bg-white" : (isCurrent ? "bg-indigo-100" : "bg-slate-200")}`}
                          style={{
                            left: `${(frame.x / template.image_width) * 100}%`,
                            top: `${(frame.y / template.image_height) * 100}%`,
                            width: `${(frame.width / template.image_width) * 100}%`,
                            height: `${(frame.height / template.image_height) * 100}%`,
                            transform: `rotate(${frame.angle || 0}deg)`,
                            transformOrigin: 'center center',
                            outline: isCurrent ? "4px solid #4f46e5" : "none",
                            outlineOffset: "-4px",
                            zIndex: isCurrent ? 5 : 1,
                          }}
                        >
                          {photo ? (
                            <img
                              src={photo}
                              className="w-full h-full object-cover"
                              style={{ filter: getFilterStyle(frameEdits[i] || { brightness: 0, contrast: 0, activeFilter: "normal" }) }}
                              alt=""
                            />
                          ) : (
                            <span className={`font-black text-2xl ${isCurrent ? 'text-indigo-500/50' : 'text-black/20'}`}>{i + 1}</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Template Overlay */}
                    <img
                      src={getImageUrl(template.template_path)}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
                      alt=""
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Memuat Preview...</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Bottom control bar (landscape/portrait compatible) */}
          <div className="shrink-0 bg-white rounded-[20px] shadow-xl px-5 py-3 flex flex-row flex-wrap items-center justify-between gap-6 border-3 border-white">
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className={`${poppins.className} text-black text-[10px] uppercase font-bold`}>FILTER</span>
                <div className="flex flex-row gap-2">
                  {filters.map(f => (
                    <button
                      key={f.id}
                      onClick={() => updateEdit("activeFilter", f.id)}
                      className={`w-9 h-9 shrink-0 rounded-lg ${f.color} border-3 transition-all relative
                            ${currentEdit.activeFilter === f.id
                          ? "border-black scale-110 shadow-lg ring-4 ring-gray-100"
                          : "border-white shadow-inner opacity-80 hover:opacity-100"
                        }`}
                      title={f.label}
                    >
                      {currentEdit.activeFilter === f.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-[200px]">
                <span className={`${poppins.className} text-black text-[10px] uppercase font-bold`}>SESUAIKAN</span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-black uppercase w-24 shrink-0">pencahayaan</span>
                    <input
                      type="range" min="-50" max="50" value={currentEdit.brightness}
                      onChange={(e) => updateEdit("brightness", Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-black"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-black uppercase w-24 shrink-0">kontras</span>
                    <input
                      type="range" min="-50" max="50" value={currentEdit.contrast}
                      onChange={(e) => updateEdit("contrast", Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-black"
                    />
                  </div>
                </div>
              </div>
          </div>
        </main>



      {showWarning && (

        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-12 py-6 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.3)] border-4 border-black animate-bounce">

          <span className={`${poppins.className} text-2xl uppercase font-black`}>Sisa 1 Menit!</span>

        </div>

      )}



      {/* Confimation Modal Ganti Template */}

      {showBackConfirm && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">

          <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-[0_30px_60px_rgba(0,0,0,0.2)] flex flex-col items-center animate-in zoom-in-95 duration-300 border-[6px] border-black">

            <div className="w-20 h-20 bg-gray-100 text-black rounded-lg flex items-center justify-center mb-8">

              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>

            </div>

            <h3 className={`${poppins.className} text-2xl text-slate-900 mb-4 text-center uppercase font-bold`}>Ganti Template?</h3>

            <p className="text-sm text-slate-500 font-bold text-center mb-10 px-4 leading-relaxed">

              Semua foto yang sudah diambil akan <strong className="text-rose-600">Terhapus</strong> jika Anda kembali.

            </p>

            <div className="flex items-center gap-4 w-full">

              <button

                onClick={() => setShowBackConfirm(false)}

                className="flex-1 py-4 rounded-lg font-black text-slate-400 border-4 border-slate-100 transition-colors uppercase tracking-widest"

              >

                BATAL

              </button>

              <button

                onClick={() => { 

                  stopCamera(); 

                  localStorage.removeItem("rawPhotos");

                  localStorage.removeItem("frameEdits");

                  localStorage.removeItem("capturedPhotos");

                  router.push(`/template?kanvas=${canvasType}`); 

                }}

                className="flex-1 py-4 rounded-lg font-black text-white bg-rose-500 shadow-lg shadow-rose-200 uppercase tracking-widest"

              >

                YA, GANTI

              </button>

            </div>

          </div>

        </div>

      )}

      {/* Session Timeout Alert Modal */}

      {showTimeoutAlert && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">

           <div className="bg-white rounded-[40px] p-12 w-full max-w-md shadow-2xl border-[8px] border-black flex flex-col items-center text-center animate-in zoom-in-95 duration-500">

              <div className="w-24 h-24 bg-gray-100 text-black rounded-lg flex items-center justify-center mb-8 animate-bounce">

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

      `}</style>

      </div>

    </div>

  );

}



export default function CameraPage() {

  return (

    <Suspense fallback={

      <div className="h-screen w-full flex items-center justify-center bg-slate-50">

        <div className="w-16 h-16 border-8 border-white border-t-transparent rounded-full animate-spin"></div>

      </div>

    }>

      <CameraContent />

    </Suspense>

  );

}

