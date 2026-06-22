import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new NextResponse('URL is required', { status: 400 });
    }

    // Determine the user data path or fallback
    const userDataPath = process.env.USER_DATA_PATH || path.join(process.cwd(), '.next');
    const cacheDir = path.join(userDataPath, 'cached_images');

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Create a safe hash for the filename based on the URL
    // We add the original query string to the hash if it exists to ensure unique versions are cached properly
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    
    // Attempt to extract an extension from the URL path
    let ext = '.png';
    try {
        const urlObj = new URL(imageUrl);
        const urlPathExt = path.extname(urlObj.pathname);
        if (urlPathExt) ext = urlPathExt;
    } catch (e) {
        // ignore invalid urls for extension parsing
    }

    const filename = `${hash}${ext}`;
    const filePath = path.join(cacheDir, filename);

    // If file exists in cache, serve it directly from disk
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      
      // Determine content type
      let contentType = 'image/png';
      const lowerExt = ext.toLowerCase();
      if (lowerExt === '.jpg' || lowerExt === '.jpeg') contentType = 'image/jpeg';
      else if (lowerExt === '.webp') contentType = 'image/webp';
      else if (lowerExt === '.gif') contentType = 'image/gif';
      else if (lowerExt === '.svg') contentType = 'image/svg+xml';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If not in cache, fetch it from the remote server
    console.log(`[Cache Image] Fetching from remote: ${imageUrl}`);
    const response = await fetch(imageUrl, {
        headers: {
           // Provide a generic user agent to prevent 403s on some servers
           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) {
      console.error(`[Cache Image] Failed to fetch image: ${response.status} ${response.statusText}`);
      // Fallback: Just redirect to the URL if fetch fails so the browser can try
      return NextResponse.redirect(imageUrl);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local cache permanently
    fs.writeFileSync(filePath, buffer);

    const contentType = response.headers.get('content-type') || 'image/png';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('[Cache Image] Error:', error.message);
    // Fallback: Redirect to original url on error
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    if (imageUrl) return NextResponse.redirect(imageUrl);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
