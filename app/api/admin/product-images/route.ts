import { createHmac, createHash, randomUUID } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { verifyAdminRole } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 82;
const OUTPUT_CONTENT_TYPE = 'image/webp';

const getEnv = (key: string) => process.env[key]?.trim() || '';

const getRequiredEnv = (key: string) => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

const toHex = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();

const getSigningKey = (secret: string, date: string) => {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
};

const getPublicUrl = (key: string) => {
  const baseUrl = getRequiredEnv('NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL');
  return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(key)}`;
};

// Re-encode any uploaded raster image to a size- and quality-capped WebP.
// Honours EXIF orientation, downscales the long edge to MAX_IMAGE_EDGE (never
// upscales), and keeps alpha where present (WebP supports transparency).
async function optimizeToWebp(file: File) {
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function putR2Object(key: string, body: Buffer, contentType: string) {
  const accountId = getRequiredEnv('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = getRequiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = getRequiredEnv('R2_SECRET_ACCESS_KEY');
  const bucket = getRequiredEnv('R2_BUCKET_NAME');

  const payloadHash = toHex(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = [
    `cache-control:${CACHE_CONTROL}`,
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    toHex(canonicalRequest),
  ].join('\n');
  const signature = createHmac('sha256', getSigningKey(secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest('hex');

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Cache-Control': CACHE_CONTROL,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`R2 upload failed: ${response.status} ${message}`);
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminRole();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image must be 10MB or smaller' }, { status: 400 });
  }

  const key = `${randomUUID()}.webp`;

  let optimized: Buffer;

  try {
    optimized = await optimizeToWebp(file);
  } catch (error) {
    console.error('[admin/product-images] Optimize failed:', error);
    return NextResponse.json({ error: 'Could not process image' }, { status: 400 });
  }

  try {
    await putR2Object(key, optimized, OUTPUT_CONTENT_TYPE);
    return NextResponse.json({ imageUrl: getPublicUrl(key), key }, { status: 201 });
  } catch (error) {
    console.error('[admin/product-images] Upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload product image' }, { status: 500 });
  }
}
