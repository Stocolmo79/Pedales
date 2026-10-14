import { getSupabaseAdminClient } from "./supabase";

const BUCKET = "product-images";

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

export async function deleteProductImage(publicUrl: string): Promise<void> {
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(prefix);
  if (index === -1) return;

  const path = publicUrl.slice(index + prefix.length);
  await getSupabaseAdminClient().storage.from(BUCKET).remove([path]);
}
