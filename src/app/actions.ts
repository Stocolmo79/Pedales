"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/admin-auth";
import { createSignedUploadUrl, deleteProductImage } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { incrementStat, type ProductStats } from "@/lib/stats";
import { LIKED_COOKIE, parseLikedCookie } from "@/lib/liked-cookie";
import { isCategory } from "@/lib/categories";
import {
  addProduct,
  getProduct,
  getProducts,
  setReservation,
  addToWaitlist,
  moveProduct,
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

  const category = formData.get("category");
  if (!isCategory(category)) {
    return { error: "Elige una categoría." };
  }

  const product: Product = {
    id: randomUUID(),
    title: title.trim(),
    price,
    description: description.trim(),
    images,
    category,
    reservedBy: null,
    waitlist: [],
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

  const category = formData.get("category");
  if (!isCategory(category)) {
    return { error: "Elige una categoría." };
  }

  const removedImages = product.images.filter((image) => !keepImages.has(image));
  const images = [...product.images.filter((image) => keepImages.has(image)), ...newImages];

  await updateProductInStore(productId, {
    title: title.trim(),
    price,
    description: description.trim(),
    images,
    category,
  });

  for (const image of removedImages) {
    await deleteProductImage(image).catch(() => undefined);
  }

  revalidatePath("/");
  revalidatePath(`/${productId}`);
  redirect(`/${productId}`);
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

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  await setReservation(productId, {
    name: trimmedName,
    email: trimmedEmail,
    reservedAt: new Date().toISOString(),
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  await Promise.allSettled([
    adminEmail
      ? sendEmail({
          to: adminEmail,
          subject: `Nueva reserva: ${product.title}`,
          html: `<p><strong>${trimmedName}</strong> (${trimmedEmail}) ha reservado <strong>${product.title}</strong> ($${product.price}).</p>`,
        })
      : Promise.resolve(),
    sendEmail({
      to: trimmedEmail,
      subject: `Reserva confirmada: ${product.title}`,
      html: `<p>Hola ${trimmedName},</p><p>Has reservado <strong>${product.title}</strong> ($${product.price}). Nos pondremos en contacto contigo pronto.</p>`,
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/${productId}`);
}

export type JoinWaitlistState = { error?: string; success?: boolean } | undefined;

export async function joinWaitlist(
  productId: string,
  _prevState: JoinWaitlistState,
  formData: FormData,
): Promise<JoinWaitlistState> {
  const name = formData.get("name");
  const email = formData.get("email");

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "El nombre es obligatorio." };
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return { error: "Introduce un correo electrónico válido." };
  }

  const product = await getProduct(productId);
  if (!product) {
    return { error: "El producto ya no existe." };
  }
  if (!product.reservedBy) {
    return { error: "Este producto no está reservado, puedes reservarlo directamente." };
  }
  if (product.waitlist.some((entry) => entry.email.toLowerCase() === email.trim().toLowerCase())) {
    return { error: "Ya estás en la lista de espera de este producto." };
  }

  await addToWaitlist(productId, {
    name: name.trim(),
    email: email.trim(),
    joinedAt: new Date().toISOString(),
  });

  revalidatePath("/");
  revalidatePath(`/${productId}`);
  return { success: true };
}

export async function moveProductOrder(
  productId: string,
  direction: "up" | "down",
): Promise<void> {
  if (!(await isAdminSession())) return;

  await moveProduct(productId, direction);
  revalidatePath("/");
}

export async function toggleLike(
  productId: string,
): Promise<{ liked: boolean; stats: ProductStats } | null> {
  if (!(await getProduct(productId))) return null;

  const cookieStore = await cookies();
  const liked = parseLikedCookie(cookieStore.get(LIKED_COOKIE)?.value);
  const nowLiked = !liked.has(productId);
  if (nowLiked) liked.add(productId);
  else liked.delete(productId);

  const stats = await incrementStat(productId, "likes", nowLiked ? 1 : -1);
  cookieStore.set(LIKED_COOKIE, [...liked].join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return { liked: nowLiked, stats };
}

export async function recordView(productId: string): Promise<ProductStats | null> {
  if (!(await getProduct(productId))) return null;
  return incrementStat(productId, "views", 1).catch(() => null);
}
