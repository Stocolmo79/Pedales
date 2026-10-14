"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/admin-auth";
import { deleteProductImage, uploadProductImage } from "@/lib/storage";
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

function validateImageFiles(files: File[]): string | undefined {
  for (const file of files) {
    if (!MIME_EXTENSIONS[file.type]) {
      return `Tipo de archivo no admitido: ${file.type || "desconocido"}.`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "Una imagen es demasiado grande (máximo 5 MB).";
    }
  }
  return undefined;
}

async function saveImageFiles(files: File[]): Promise<string[]> {
  const images: string[] = [];
  for (const file of files) {
    const filename = `${randomUUID()}${MIME_EXTENSIONS[file.type]}`;
    images.push(await uploadProductImage(file, filename));
  }
  return images;
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
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

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

  const fileError = validateImageFiles(files);
  if (fileError) return { error: fileError };

  const images = await saveImageFiles(files);

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
  const newFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

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

  const fileError = validateImageFiles(newFiles);
  if (fileError) return { error: fileError };

  const removedImages = product.images.filter((image) => !keepImages.has(image));
  const newImages = await saveImageFiles(newFiles);
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
