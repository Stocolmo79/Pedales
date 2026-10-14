import { getSupabaseAdminClient } from "./supabase";

const BUCKET = "product-images";

// Used for small/local scenarios; prefer createSignedUploadUrl for browser uploads
// so large files never pass through the serverless function body (Netlify/Lambda
// cap synchronous function payloads around 6 MB regardless of Next.js config).
export async function uploadProductImage(file: File, filename: string): Promise<string> {
  const client = getSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(BUCKET).upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function createSignedUploadUrl(
  filename: string,
): Promise<{ signedUrl: string; publicUrl: string }> {
  const client = getSupabaseAdminClient();

  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(filename);
  if (error) throw new Error(error.message);

  const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(filename);
  return { signedUrl: data.signedUrl, publicUrl: publicData.publicUrl };
}

export async function deleteProductImage(publicUrl: string): Promise<void> {
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(prefix);
  if (index === -1) return;

  const path = publicUrl.slice(index + prefix.length);
  await getSupabaseAdminClient().storage.from(BUCKET).remove([path]);
}

