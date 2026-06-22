import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, context: { params: Promise<{ file: string }> }) {
  try {
    const params = await context.params;
    const filename = params.file;
    if (!filename) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Determine the safe directory
    const userData = process.env.USER_DATA_PATH;
    const bgDir = userData 
      ? path.join(userData, 'backgrounds') 
      : path.join(process.cwd(), 'public', 'backgrounds');

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(bgDir, safeFilename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filepath);
    
    // Guess mime type
    const ext = path.extname(filepath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.svg') mimeType = 'image/svg+xml';

    const res = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
    
    return res;
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
