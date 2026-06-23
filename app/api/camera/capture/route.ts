import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';

/**
 * Scan a directory recursively for the newest .jpg file created after `afterTimestamp`.
 */
function findNewestPhoto(dir: string, afterTimestamp: number): string | null {
  let newestFile: string | null = null;
  let newestTime = afterTimestamp;

  try {
    if (!fs.existsSync(dir)) return null;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Recurse into subdirectories (Session 1, Session 2, etc.)
        const found = findNewestPhoto(fullPath, afterTimestamp);
        if (found) {
          const foundTime = fs.statSync(found).mtimeMs;
          if (foundTime > newestTime) {
            newestFile = found;
            newestTime = foundTime;
          }
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg' || ext === '.cr2' || ext === '.nef' || ext === '.png') {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > newestTime && stat.size > 10000) { // > 10KB = foto asli
              newestFile = fullPath;
              newestTime = stat.mtimeMs;
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  return newestFile;
}

export async function POST() {
  try {
    console.log("=== DSLR Capture Started ===");

    // Folder-folder yang mungkin digunakan digiCamControl untuk menyimpan foto
    const homeDir = os.homedir();
    const searchFolders = [
      path.join(homeDir, 'OneDrive', 'Pictures', 'digiCamControl'),
      path.join(homeDir, 'Pictures', 'digiCamControl'),
      path.join(homeDir, 'OneDrive', 'Gambar', 'digiCamControl'),
      path.join(homeDir, 'Gambar', 'digiCamControl'),
    ];
    
    // Catat waktu SEBELUM kita menjepret
    const beforeTimestamp = Date.now() - 1000; // 1 detik margin

    // 1. Kirim perintah capture ke digiCamControl via RemoteCmd (Anti-gagal & bypass HTTP)
    try {
      const dccRemotePath = `"C:\\Program Files (x86)\\digiCamControl\\CameraControlRemoteCmd.exe"`;
      await execPromise(`${dccRemotePath} /c capture`);
      console.log("Capture command sent via RemoteCmd.");
    } catch (execErr: any) {
      console.error("Gagal mengirim perintah RemoteCmd:", execErr.message);
      return NextResponse.json({ 
        success: false, 
        message: 'Gagal mengeksekusi CameraControlRemoteCmd. Pastikan digiCamControl berjalan.'
      }, { status: 500 });
    }

    // 2. Polling: cari file foto BARU di semua folder digiCamControl
    let photoPath: string | null = null;
    
    for (let attempt = 0; attempt < 16; attempt++) { // Maks 8 detik (16 x 500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      for (const folder of searchFolders) {
        photoPath = findNewestPhoto(folder, beforeTimestamp);
        if (photoPath) break;
      }
      
      if (photoPath) {
        // Pastikan file selesai ditulis (ukuran stabil)
        const size1 = fs.statSync(photoPath).size;
        await new Promise(resolve => setTimeout(resolve, 300));
        const size2 = fs.statSync(photoPath).size;
        
        if (size1 === size2 && size1 > 10000) {
          console.log(`Foto ditemukan: ${photoPath} (${(size2 / 1024).toFixed(0)} KB, attempt ${attempt + 1})`);
          break;
        } else {
          photoPath = null; // File masih ditulis, coba lagi
        }
      }
    }

    // 3. Restart Live View di digiCamControl agar preview tidak macet
    try {
      // Tunggu sebentar agar kamera selesai saving sebelum memaksa Live View menyala lagi
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dccRemotePath = `"C:\\Program Files (x86)\\digiCamControl\\CameraControlRemoteCmd.exe"`;
      // Start live view via HTTP Web Server as primary
      await fetch("http://127.0.0.1:5513/?slc=startliveview", {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
      
      console.log("Live View restarted.");
    } catch (e) {
      // Tidak fatal jika gagal
    }

    // 4. Baca file dan konversi ke Base64
    if (photoPath) {
      try {
        const fileBuffer = fs.readFileSync(photoPath);
        const ext = path.extname(photoPath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        
        console.log(`=== Capture berhasil! File: ${path.basename(photoPath)} ===`);
        
        return NextResponse.json({ 
          success: true, 
          photoUrl: base64Data 
        });
      } catch (readErr: any) {
        console.error("Gagal membaca file foto:", readErr.message);
      }
    }

    // 5. Fallback: tidak ada foto ditemukan
    console.warn("=== Foto High-Res tidak ditemukan ===");
    console.warn("Folder yang dicari:", searchFolders.filter(f => fs.existsSync(f)).join(", "));
    
    return NextResponse.json({ 
      success: true, 
      photoUrl: null 
    });

  } catch (error: any) {
    console.error("Capture Route Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error: ' + error.message 
    }, { status: 500 });
  }
}
