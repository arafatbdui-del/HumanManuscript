import fs from 'node:fs';
import zlib from 'node:zlib';

function createPNG(width: number, height: number, r: number, g: number, b: number, a: number = 255) {
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw a subtle border and inner legal crest / monogram
      const isMargin = x < 8 || x >= width - 8 || y < 8 || y >= height - 8;
      const isInner = x >= width * 0.2 && x <= width * 0.8 && y >= height * 0.2 && y <= height * 0.8;
      
      if (isMargin) {
        rawData[pixelOffset] = 15;     // Deep navy
        rawData[pixelOffset + 1] = 23;
        rawData[pixelOffset + 2] = 42;
        rawData[pixelOffset + 3] = 255;
      } else if (isInner && (x === Math.floor(width/2) || y === Math.floor(height * 0.35) || (y > height * 0.35 && y < height * 0.7 && Math.abs(x - width/2) < width * 0.18))) {
        // Gold legal scale / crest
        rawData[pixelOffset] = 234;
        rawData[pixelOffset + 1] = 179;
        rawData[pixelOffset + 2] = 8;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = a;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function createChunk(type: string, data: Buffer): Buffer {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 'ascii');
    data.copy(chunk, 8);

    let crc = 0xffffffff;
    const bufToCrc = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    for (let i = 0; i < bufToCrc.length; i++) {
      crc = updateCrc(crc, bufToCrc[i]);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    chunk.writeUInt32BE(crc, 8 + data.length);
    return chunk;
  }

  // CRC32 table
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function updateCrc(crc: number, byte: number): number {
    return (crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

// Navy blue #1e293b background
fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, 30, 41, 59));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, 30, 41, 59));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, 15, 23, 42));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, 30, 41, 59));
console.log('PWA PNG assets successfully generated.');
