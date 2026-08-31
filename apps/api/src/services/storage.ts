import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { getApiUrl, getFrontendUrl } from '../lib/urls';
import { validateImageBuffer } from '../lib/image-validation';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function safeUploadFilename(filename: string): string | null {
  const base = path.basename(filename);
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) {
    return null;
  }
  return base;
}

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    !process.env.R2_ACCESS_KEY_ID.includes('your-')
  );
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!;
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL must be set when R2 is configured');
  }
  const basePublicUrl = publicUrl.replace(/\/$/, '');

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${bucket}/${key}`;
  const date = new Date().toUTCString();

  const { createHmac, createHash } = await import('crypto');
  const payloadHash = createHash('sha256').update(buffer).digest('hex');

  const canonicalHeaders = `host:${accountId}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${date}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `PUT\n/${bucket}/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${date.slice(0, 8)}/auto/s3/aws4_request\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const getSignatureKey = (key: string, dateStamp: string) => {
    const kDate = createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update('auto').digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  };

  const signature = createHmac('sha256', getSignatureKey(secretAccessKey, date.slice(0, 8)))
    .update(stringToSign)
    .digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${date.slice(0, 8)}/auto/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': date,
      Authorization: authorization,
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed: ${response.status} ${text}`);
  }

  return `${basePublicUrl}/${key}`;
}

async function uploadLocally(buffer: Buffer, filename: string): Promise<string> {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

export async function processAndUploadImage(
  fileBuffer: Buffer,
  originalName: string,
  folder: 'products' | 'site' | 'catalog' = 'products'
): Promise<string> {
  await validateImageBuffer(fileBuffer);

  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const id = crypto.randomBytes(16).toString('hex');
  const filename = `${id}${ext === '.png' ? '.webp' : ext === '.webp' ? '.webp' : '.webp'}`;

  const processed = await sharp(fileBuffer)
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  if (isR2Configured()) {
    return uploadToR2(processed, `${folder}/${filename}`, 'image/webp');
  }

  return uploadLocally(processed, filename);
}

export async function processAndUploadCatalogSwatch(
  fileBuffer: Buffer
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  await validateImageBuffer(fileBuffer);

  const id = crypto.randomBytes(16).toString('hex');
  const imageBuffer = await sharp(fileBuffer)
    .resize(1200, 1200, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
  const thumbBuffer = await sharp(fileBuffer)
    .resize(280, 280, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  if (isR2Configured()) {
    const imageUrl = await uploadToR2(imageBuffer, `catalog/${id}.webp`, 'image/webp');
    const thumbnailUrl = await uploadToR2(thumbBuffer, `catalog/${id}-thumb.webp`, 'image/webp');
    return { imageUrl, thumbnailUrl };
  }

  await ensureUploadDir();
  const imageFilename = `${id}.webp`;
  const thumbFilename = `${id}-thumb.webp`;
  await fs.writeFile(path.join(UPLOAD_DIR, imageFilename), imageBuffer);
  await fs.writeFile(path.join(UPLOAD_DIR, thumbFilename), thumbBuffer);
  return { imageUrl: `/uploads/${imageFilename}`, thumbnailUrl: `/uploads/${thumbFilename}` };
}

export async function deleteImageByUrl(url: string): Promise<void> {
  const frontendUrl = getFrontendUrl();
  const apiUrl = getApiUrl();

  let filename: string | undefined;

  if (url.startsWith(`${frontendUrl}/uploads/`)) {
    filename = url.split('/uploads/')[1];
  } else if (url.startsWith(`${apiUrl}/uploads/`)) {
    filename = url.split('/uploads/')[1];
  } else if (url.startsWith('/uploads/')) {
    filename = url.split('/uploads/')[1];
  }

  if (filename) {
    const safeName = safeUploadFilename(filename);
    if (!safeName) {
      return;
    }
    try {
      await fs.unlink(path.join(UPLOAD_DIR, safeName));
    } catch {
      // ignore missing files
    }
  }
}
