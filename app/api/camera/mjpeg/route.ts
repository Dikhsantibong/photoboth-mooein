import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch('http://127.0.0.1:5514/live', {
      cache: 'no-store',
      headers: { 'Connection': 'keep-alive' }
    });

    if (!res.ok) {
      return new Response('Not found', { status: res.status });
    }

    // Mengambil langsung stream response body untuk MJPEG
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=myboundary',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive'
      },
    });

  } catch (error: any) {
    console.error("MJPEG Proxy Error:", error);
    return new Response(JSON.stringify({ error: 'Error connecting to digiCamControl MJPEG stream', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
