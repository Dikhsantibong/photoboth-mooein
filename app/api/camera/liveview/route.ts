import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Gunakan 127.0.0.1 secara eksplisit untuk menghindari masalah resolusi IPv6 'localhost'
    const res = await fetch('http://127.0.0.1:5513/liveview.jpg', {
      cache: 'no-store',
      headers: { 'Connection': 'keep-alive' }
    });

    if (!res.ok) {
      return new Response('Not found', { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error: any) {
    console.error("LiveView Proxy Error:", error);
    return new Response(JSON.stringify({ error: 'Error connecting to digiCamControl', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
