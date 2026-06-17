import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const token = process.env.TOKEN;
    const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');

    if (!token || !baseUrl) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const incomingFormData = await request.formData();

    // Reconstruct FormData to preserve file metadata (name, type)
    // This is necessary because Next.js can lose file metadata when proxying
    const outgoingFormData = new FormData();

    for (const [key, value] of incomingFormData.entries()) {
      if (typeof value === 'object' && value !== null && 'name' in value) {
        const file = value as any;
        const fileName = file.name || (key === 'video' ? 'final.mp4' : 'file.bin');
        
        // Ensure correct content type for video files
        let contentType = file.type;
        if (key === 'video' && (!contentType || contentType === 'application/octet-stream')) {
          if (fileName.endsWith('.mp4')) contentType = 'video/mp4';
          else if (fileName.endsWith('.webm')) contentType = 'video/webm';
          else if (fileName.endsWith('.mov')) contentType = 'video/quicktime';
          else contentType = 'video/mp4'; // default to mp4
        }

        const ab = await file.arrayBuffer();
        console.log(`[API Proxy] Processing file ${key}: name=${fileName}, originalType=${file.type}, newType=${contentType}, size=${ab.byteLength}`);

        if (ab.byteLength === 0) {
          console.warn(`[API Proxy] Warning: File ${key} has 0 bytes! Skipping to avoid Laravel 422 validation error.`);
        } else {
          const properFile = new File([ab], fileName, { type: contentType });
          outgoingFormData.append(key, properFile, fileName);
        }
      } else {
        console.log(`[API Proxy] Processing field ${key}: ${value}`);
        outgoingFormData.append(key, value);
      }
    }

    const response = await fetch(`${baseUrl}/api/final-images`, {
      method: 'POST',
      headers: {
        'X-Machine-Token': token,
        'Accept': 'application/json',
      },
      body: outgoingFormData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[API/final-images] Laravel returned ${response.status}:`, JSON.stringify(data));
    }
    
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Final Image Upload Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
