// Products are stored as one JSON document in a PRIVATE R2 bucket (contains customer names/emails).
import { GetObjectCommand, PutObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { connection } from "next/server";
import { getS3Client } from "./storage";

export type Reservation = {
  name: string;
  email: string;
  reservedAt: string;
};

export type WaitlistEntry = {
  name: string;
  email: string;
  joinedAt: string;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  reservedBy: Reservation | null;
  waitlist: WaitlistEntry[];
};

const DATA_BUCKET = process.env.S3_DATA_BUCKET ?? "product-data";
const KEY = "products.json";

async function load(): Promise<{ products: Product[]; etag: string | undefined }> {
  // Product data is live; also the AWS SDK uses crypto.randomUUID(), which can't run during prerender.
  await connection();
  try {
    const res = await getS3Client().send(new GetObjectCommand({ Bucket: DATA_BUCKET, Key: KEY }));
    const text = (await res.Body?.transformToString()) ?? "[]";
    return { products: JSON.parse(text) as Product[], etag: res.ETag };
  } catch (err) {
    if (err instanceof S3ServiceException && err.name === "NoSuchKey") {
      return { products: [], etag: undefined };
    }
    throw err;
  }
}

// Read-modify-write with an ETag precondition so concurrent writes (e.g. two reservations) aren't lost.
async function mutate<T>(change: (products: Product[]) => T): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { products, etag } = await load();
    const result = change(products);
    try {
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: DATA_BUCKET,
          Key: KEY,
          Body: JSON.stringify(products, null, 2),
          ContentType: "application/json",
          ...(etag ? { IfMatch: etag } : { IfNoneMatch: "*" }),
        }),
      );
      return result;
    } catch (err) {
      if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 412) continue;
      throw err;
    }
  }
  throw new Error("No se pudo guardar el producto. Inténtalo de nuevo.");
}

function normalize(product: Product): Product {
  return { ...product, images: product.images ?? [], reservedBy: product.reservedBy ?? null, waitlist: product.waitlist ?? [] };
}

export async function getProducts(): Promise<Product[]> {
  const { products } = await load();
  return products.map(normalize);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const product = (await getProducts()).find((p) => p.id === id);
  return product;
}

export async function addProduct(product: Product): Promise<void> {
  await mutate((products) => {
    products.push(normalize(product));
  });
}

export async function updateProduct(
  id: string,
  updates: Pick<Product, "title" | "price" | "description" | "images">,
): Promise<Product | undefined> {
  return mutate((products) => {
    const product = products.find((p) => p.id === id);
    if (!product) return undefined;
    Object.assign(product, updates);
    return normalize(product);
  });
}

export async function setReservation(
  id: string,
  reservation: Reservation | null,
): Promise<Product | undefined> {
  return mutate((products) => {
    const product = products.find((p) => p.id === id);
    if (!product) return undefined;
    product.reservedBy = reservation;
    return normalize(product);
  });
}

export async function addToWaitlist(
  id: string,
  entry: WaitlistEntry,
): Promise<Product | undefined> {
  return mutate((products) => {
    const product = products.find((p) => p.id === id);
    if (!product) return undefined;
    product.waitlist = [...(product.waitlist ?? []), entry];
    return normalize(product);
  });
}

// "up"/"down" refer to the reversed (newest-first) list order shown on the page.
export async function moveProduct(id: string, direction: "up" | "down"): Promise<void> {
  await mutate((products) => {
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return;

    const swapIndex = direction === "up" ? index + 1 : index - 1;
    if (swapIndex < 0 || swapIndex >= products.length) return;

    [products[index], products[swapIndex]] = [products[swapIndex], products[index]];
  });
}
