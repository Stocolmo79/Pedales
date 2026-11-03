// One-off: copies product images from Supabase Storage to R2 and rewrites the URLs in the products table.
// Usage: node --env-file=.env.local scripts/migrate-images-to-r2.mjs [--dry-run]
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const dryRun = process.argv.includes("--dry-run");
const bucket = process.env.S3_BUCKET ?? "product-images";
const publicBase = process.env.S3_PUBLIC_URL_BASE.replace(/\/$/, "");

// Plain REST instead of supabase-js, which requires Node 22+ (native WebSocket).
const restUrl = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/products`;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  "Content-Type": "application/json",
};

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const SUPABASE_MARKER = "/storage/v1/object/public/";

const listRes = await fetch(`${restUrl}?select=id,title,images`, { headers: supabaseHeaders });
if (!listRes.ok) throw new Error(`Supabase ${listRes.status}: ${await listRes.text()}`);
const products = await listRes.json();

let copied = 0;
let failed = 0;

for (const product of products) {
  const images = product.images ?? [];
  const newImages = [];
  let changed = false;

  for (const url of images) {
    const index = url.indexOf(SUPABASE_MARKER);
    if (url.startsWith(publicBase) || index === -1) {
      if (!url.startsWith(publicBase)) console.warn(`  ? okänd källa, lämnas orörd: ${url}`);
      newImages.push(url);
      continue;
    }

    // Path after "<bucket>/" in the Supabase URL becomes the R2 key.
    const objectPath = url.slice(index + SUPABASE_MARKER.length);
    const key = objectPath.slice(objectPath.indexOf("/") + 1);
    const newUrl = `${publicBase}/${key}`;

    try {
      if (!dryRun) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(await res.arrayBuffer()),
            ContentType: res.headers.get("content-type") ?? "application/octet-stream",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      }
      console.log(`  ✓ ${key}`);
      newImages.push(newUrl);
      changed = true;
      copied++;
    } catch (err) {
      console.error(`  ✗ ${url}: ${err.message}`);
      newImages.push(url);
      failed++;
    }
  }

  if (changed && !dryRun) {
    const updateRes = await fetch(`${restUrl}?id=eq.${encodeURIComponent(product.id)}`, {
      method: "PATCH",
      headers: supabaseHeaders,
      body: JSON.stringify({ images: newImages }),
    });
    if (!updateRes.ok) throw new Error(`${product.title}: ${updateRes.status} ${await updateRes.text()}`);
  }
  if (changed) console.log(`${dryRun ? "[dry-run] " : ""}${product.title}: ${newImages.length} bilder`);
}

console.log(`\nKlart. Kopierade: ${copied}, misslyckade: ${failed}${dryRun ? " (dry-run, inget ändrat)" : ""}`);
