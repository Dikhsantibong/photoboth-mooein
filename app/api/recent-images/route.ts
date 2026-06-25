import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.TOKEN;
    const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');

    if (!token || !baseUrl) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch(`${baseUrl}/api/final-images/recent`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Machine-Token': token,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Recent images API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
