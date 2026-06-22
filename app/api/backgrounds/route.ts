import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getBgDir = () => {
  const userData = process.env.USER_DATA_PATH;
  if (userData) {
    return path.join(userData, 'backgrounds');
  }
  return path.join(process.cwd(), 'public', 'backgrounds');
};

export async function GET() {
  try {
    const bgDir = getBgDir();
    if (!fs.existsSync(bgDir)) {
      fs.mkdirSync(bgDir, { recursive: true });
    }
    
    const files = fs.readdirSync(bgDir);
    // Filter out only images
    const images = files.filter(file => /\.(png|jpe?g|webp|gif|svg)$/i.test(file));
    
    // Return relative paths that can be used directly in <img> or url()
    const urls = images.map(file => `/backgrounds/${file}`);
    
    return NextResponse.json({ success: true, data: urls });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const bgDir = getBgDir();
    if (!fs.existsSync(bgDir)) {
      fs.mkdirSync(bgDir, { recursive: true });
    }
    
    // Check limit
    const existingFiles = fs.readdirSync(bgDir).filter(file => /\.(png|jpe?g|webp|gif|svg)$/i.test(file));
    if (existingFiles.length >= 5) {
      return NextResponse.json({ success: false, message: 'Batas maksimal 5 gambar tercapai. Hapus beberapa gambar terlebih dahulu.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    // Safe filename
    const ext = path.extname(file.name);
    const basename = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const newFilename = `${basename}_${timestamp}${ext}`;
    
    const filepath = path.join(bgDir, newFilename);
    fs.writeFileSync(filepath, buffer);
    
    return NextResponse.json({ success: true, url: `/backgrounds/${newFilename}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const bgDir = getBgDir();
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('file');
    
    if (!filename) {
      return NextResponse.json({ success: false, message: 'File not specified' }, { status: 400 });
    }
    
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(bgDir, safeFilename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return NextResponse.json({ success: true, message: 'File deleted' });
    } else {
      return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
