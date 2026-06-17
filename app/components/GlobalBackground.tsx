"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GlobalBackground() {
  const pathname = usePathname();

  useEffect(() => {
    // Jalankan setiap kali rute berubah untuk memastikan background di-apply
    const applyBackground = () => {
      const savedBg = localStorage.getItem("welcomeBgImage");
      if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
      } else {
        document.body.style.backgroundImage = "";
        document.body.style.backgroundSize = "";
        document.body.style.backgroundPosition = "";
        document.body.style.backgroundAttachment = "";
      }
    };

    applyBackground();

    // Dengarkan event storage dari tab/jendela lain jika ada, atau event manual
    const handleStorage = () => applyBackground();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pathname]);

  return null;
}
