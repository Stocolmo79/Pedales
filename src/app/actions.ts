"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/admin-auth";
import { createSignedUploadUrl, deleteProductImage } from "@/lib/storage";
import {
  addProduct,
  getProduct,
  getProducts,
  setReservation,
  updateProduct as updateProductInStore,
  type Product,
} from "@/lib/products";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export type RequestImageUploadResult =
  | { error: string }
  | { signedUrl: string; publicUrl: string };

// Called directly from the browser (not as a form action) before uploading a file,
// so the image bytes go straight from the browser to Supabase Storage instead of
// through this serverless function (which has a small body-size limit on Netlify).
export async function requestImageUploadUrl(
  contentType: string,
  size: number,
): Promise<RequestImageUploadResult> {
  if (!(await isAdminSession())) {
    return { error: "Debes haber iniciado sesión como administrador." };
  }

  const ext = MIME_EXTENSIONS[contentType];
  if (!ext) {
    return { error: `Tipo de archivo no admitido: ${contentType || "desconocido"}.` };
  }
  if (size > MAX_IMAGE_SIZE) {
    return { error: "Una imagen es demasiado grande (máximo 5 MB)." };
  }

  const filename = `${randomUUID()}${ext}`;
  return createSignedUploadUrl(filename);
}

export async function discardUploadedImage(publicUrl: string): Promise<void> {
  if (!(await isAdminSession())) return;
  await deleteProductImage(publicUrl).catch(() => undefined);
}

export type CreateProductState = { error?: string } | undefined;

export async function createProduct(
  _prevState: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  if (!(await isAdminSession())) {
    return { error: "Debes haber iniciado sesión como administrador." };
  }

  const title = formData.get("title");
  const priceRaw = formData.get("price");
  const description = formData.get("description");
  const images = formData
    .getAll("imageUrls")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "El título es obligatorio." };
  }

  const price = typeof priceRaw === "string" ? Number(priceRaw) : NaN;
  if (Number.isNaN(price) || price < 0) {
    return { error: "Introduce un precio válido." };
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return { error: "La descripción es obligatoria." };
  }

  const product: Product = {
    id: randomUUID(),
    title: title.trim(),
    price,
    description: description.trim(),
    images,
    reservedBy: null,
  };

  await addProduct(product);

  revalidatePath("/");
  redirect("/");
}

export type UpdateProductState = { error?: string } | undefined;

export async function updateProduct(
  productId: string,
  _prevState: UpdateProductState,
  formData: FormData,
): Promise<UpdateProductState> {
  if (!(await isAdminSession())) {
    return { error: "Debes haber iniciado sesión como administrador." };
  }

  const product = await getProduct(productId);
  if (!product) {
    return { error: "El producto ya no existe." };
  }

  const title = formData.get("title");
  const priceRaw = formData.get("price");
  const description = formData.get("description");
  const keepImages = new Set(formData.getAll("keepImages").filter((v): v is string => typeof v === "string"));
  const newImages = formData
    .getAll("imageUrls")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "El título es obligatorio." };
  }

  const price = typeof priceRaw === "string" ? Number(priceRaw) : NaN;
  if (Number.isNaN(price) || price < 0) {
    return { error: "Introduce un precio válido." };
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return { error: "La descripción es obligatoria." };
  }

  const removedImages = product.images.filter((image) => !keepImages.has(image));
  const images = [...product.images.filter((image) => keepImages.has(image)), ...newImages];

  await updateProductInStore(productId, {
    title: title.trim(),
    price,
    description: description.trim(),
    images,
  });

  for (const image of removedImages) {
    await deleteProductImage(image).catch(() => undefined);
  }

  revalidatePath("/");
  redirect("/");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReserveProductState = { error?: string } | undefined;

export async function reserveProduct(
  productId: string,
  _prevState: ReserveProductState,
  formData: FormData,
): Promise<ReserveProductState> {
  const name = formData.get("name");
  const email = formData.get("email");

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "El nombre es obligatorio." };
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return { error: "Introduce un correo electrónico válido." };
  }

  const products = await getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    return { error: "El producto ya no existe." };
  }
  if (product.reservedBy) {
    return { error: "El producto ya está reservado." };
  }

  await setReservation(productId, {
    name: name.trim(),
    email: email.trim(),
    reservedAt: new Date().toISOString(),
  });

  revalidatePath("/");
}
