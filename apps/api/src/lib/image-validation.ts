import sharp from 'sharp';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function validateImageBuffer(buffer: Buffer): Promise<void> {
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Invalid image file size');
  }

  try {
    const meta = await sharp(buffer).metadata();
    const format = meta.format;
    if (!format || !['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff'].includes(format)) {
      throw new Error('Unsupported image format');
    }
    if ((meta.width ?? 0) > 8000 || (meta.height ?? 0) > 8000) {
      throw new Error('Image dimensions too large');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Unsupported')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('dimensions')) {
      throw err;
    }
    throw new Error('Invalid or corrupted image file');
  }
}
