import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    const userData = process.env.USER_DATA_PATH || process.cwd();
    const tempDir = path.join(userData, 'temp_captures');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filename for this capture
    const timestamp = Date.now();
    const filename = `capture_${timestamp}.jpg`;
    const filepath = path.join(tempDir, filename);

    // Default install path for digiCamControl
    const dccPath = `"C:\\Program Files (x86)\\digiCamControl\\CameraControlCmd.exe"`;
    
    // Command to capture and save to specific path
    const command = `${dccPath} /capture /filename "${filepath}"`;

    console.log(`Executing DSLR capture: ${command}`);

    let stdoutStr = "";
    let stderrStr = "";

    // Set a timeout so we don't hang forever if camera is stuck
    try {
      const { stdout, stderr } = await execPromise(command, { timeout: 10000 });
      stdoutStr = stdout;
      stderrStr = stderr;
      console.log("digiCamControl output:", stdout);
    } catch (execError: any) {
      console.error("digiCamControl execution error:", execError);
      return NextResponse.json({ 
        success: false, 
        message: 'Gagal mengeksekusi digiCamControl. Pastikan aplikasi tersebut terinstal dan kamera terhubung.',
        error: execError.message
      }, { status: 500 });
    }

    // Wait for file to be created (digiCamControl might run asynchronously if GUI is open)
    let fileFound = false;
    let attempts = 0;
    while (attempts < 20) { // 20 attempts * 400ms = 8 seconds timeout
      if (fs.existsSync(filepath)) {
        try {
          const stats = fs.statSync(filepath);
          // Ensure file is completely written (larger than 0 bytes)
          if (stats.size > 1000) { 
            // Add a small delay to ensure OS file write buffers are flushed
            await new Promise(resolve => setTimeout(resolve, 300));
            fileFound = true;
            break;
          }
        } catch (e) {
          // File might be locked during write, ignore and retry
        }
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      attempts++;
    }

    if (!fileFound) {
      return NextResponse.json({ 
        success: false, 
        message: `Kamera dipicu tetapi file foto tidak ditemukan (Waktu habis menunggu proses simpan foto).\nLog digiCamControl:\n${stdoutStr}`
      }, { status: 500 });
    }

    // Read file and convert to Base64 to send immediately to frontend
    const fileBuffer = fs.readFileSync(filepath);
    const base64Data = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

    // Clean up older files (keep only last 10 to save space)
    try {
      const files = fs.readdirSync(tempDir)
        .filter(f => f.startsWith('capture_'))
        .sort()
        .reverse();
        
      if (files.length > 10) {
        for (let i = 10; i < files.length; i++) {
          fs.unlinkSync(path.join(tempDir, files[i]));
        }
      }
    } catch (cleanupError) {
      console.error("Failed to clean up old temp captures:", cleanupError);
    }

    return NextResponse.json({ 
      success: true, 
      photoUrl: base64Data 
    });

  } catch (error: any) {
    console.error("Native Capture Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
