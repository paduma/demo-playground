/**
 * Blind (invisible) watermark — encode/decode text into image pixels.
 *
 * Technique: Modify the LSB (least significant bit) of the blue channel
 * to embed binary data. Invisible to human eyes but extractable.
 */

/** Encode text into an image canvas */
export function encodeBlindWatermark(
  sourceCanvas: HTMLCanvasElement,
  text: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert text to binary string
  const binary = textToBinary(text);

  // Store length in first 32 pixels (32-bit integer)
  const lenBin = binary.length.toString(2).padStart(32, '0');
  for (let i = 0; i < 32; i++) {
    const idx = i * 4 + 2; // blue channel
    data[idx] = (data[idx] & 0xFE) | parseInt(lenBin[i]);
  }

  // Store data starting from pixel 32
  for (let i = 0; i < binary.length; i++) {
    const idx = (i + 32) * 4 + 2;
    if (idx >= data.length) break;
    data[idx] = (data[idx] & 0xFE) | parseInt(binary[i]);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Decode text from an image canvas */
export function decodeBlindWatermark(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Read length from first 32 pixels
  let lenBin = '';
  for (let i = 0; i < 32; i++) {
    lenBin += (data[i * 4 + 2] & 1).toString();
  }
  const len = parseInt(lenBin, 2);
  if (len <= 0 || len > 100000) return '';

  // Read data
  let binary = '';
  for (let i = 0; i < len; i++) {
    const idx = (i + 32) * 4 + 2;
    if (idx >= data.length) break;
    binary += (data[idx] & 1).toString();
  }

  return binaryToText(binary);
}

function textToBinary(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map(b => b.toString(2).padStart(8, '0'))
    .join('');
}

function binaryToText(binary: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i += 8) {
    bytes.push(parseInt(binary.slice(i, i + 8), 2));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Create a sample image canvas with some content */
export function createSampleCanvas(width = 400, height = 300): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#e6f4ff');
  grad.addColorStop(1, '#f6ffed');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Some shapes
  ctx.fillStyle = '#1677ff40';
  ctx.beginPath();
  ctx.arc(100, 100, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#52c41a40';
  ctx.fillRect(200, 80, 120, 120);

  ctx.fillStyle = '#faad1440';
  ctx.beginPath();
  ctx.moveTo(320, 220);
  ctx.lineTo(380, 280);
  ctx.lineTo(260, 280);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#333';
  ctx.font = '18px sans-serif';
  ctx.fillText('Sample Document', 20, 40);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('This image contains a hidden watermark', 20, height - 20);

  return canvas;
}
