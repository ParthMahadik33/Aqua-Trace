import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Locate the video file directly inside frontend/assets/
    const assetsDir = path.join(process.cwd(), 'assets');
    const primaryFile = path.join(assetsDir, 'hero-bg.mp4');

    let videoPath = primaryFile;
    if (!fs.existsSync(videoPath)) {
      // Check for legacy names or any .mp4 file in assets
      const legacyFile = path.join(assetsDir, 'Ocean_oil_spill_environmental_do._202609080033.mp4');
      if (fs.existsSync(legacyFile)) {
        videoPath = legacyFile;
      } else {
        const files = fs.readdirSync(assetsDir);
        const mp4File = files.find((f) => f.toLowerCase().endsWith('.mp4'));
        if (mp4File) {
          videoPath = path.join(assetsDir, mp4File);
        } else {
          return new NextResponse('Hero video asset not found', { status: 404 });
        }
      }
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      // Parse Range: bytes=start-end
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(videoPath, { start, end });

      // Convert Node readable stream to Web ReadableStream
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(stream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // No range requested, stream whole file
    const fileStream = fs.createReadStream(videoPath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to stream hero background video:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
