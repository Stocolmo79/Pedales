import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET ?? "product-images";

// Cloudflare R2 (S3-compatible, free egress). Uploads are presigned against
// S3_ENDPOINT; images are served from S3_PUBLIC_URL_BASE (r2.dev or custom domain).
let client: S3Client | undefined;

function getS3Client(): S3Client {
  if (client) return client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "El almacenamiento S3 no está configurado. Define S3_ENDPOINT, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY.",
    );
  }

  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "auto",
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getPublicBase(): string {
  const base = process.env.S3_PUBLIC_URL_BASE;
  if (!base) {
    throw new Error("El almacenamiento S3 no está configurado. Define S3_PUBLIC_URL_BASE.");
  }
  return base.replace(/\/$/, "");
}

function getPublicUrl(filename: string): string {
  return `${getPublicBase()}/${filename}`;
}

// Used for small/local scenarios; prefer createSignedUploadUrl for browser uploads
// so large files never pass through the serverless function body (Netlify/Lambda
// cap synchronous function payloads around 6 MB regardless of Next.js config).
export async function uploadProductImage(file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return getPublicUrl(filename);
}

// No CacheControl here: it would have to be signed and sent back by the
// browser's PUT request as an identical header, or the signature fails.
// Set a long max-age via a Cloudflare cache rule instead (filenames are random UUIDs).
export async function createSignedUploadUrl(
  filename: string,
): Promise<{ signedUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: filename });
  const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 });

  return { signedUrl, publicUrl: getPublicUrl(filename) };
}

export async function deleteProductImage(publicUrl: string): Promise<void> {
  const prefix = `${getPublicBase()}/`;
  if (!publicUrl.startsWith(prefix)) return;

  const key = publicUrl.slice(prefix.length);
  await getS3Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

