import sharp from 'sharp';

/** A JPEG of the given size filled with noise (noise keeps the file large). */
export async function noiseJpeg(width: number, height: number, quality = 90): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: 'gaussian', mean: 128, sigma: 50 } },
  })
    .jpeg({ quality })
    .toBuffer();
}

export async function solidPng(width = 640, height = 480): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 20 } } })
    .png()
    .toBuffer();
}
