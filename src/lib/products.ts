import { promises as fs } from "fs";
import path from "path";

export type Reservation = {
  name: string;
  email: string;
  reservedAt: string;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  reservedBy: Reservation | null;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "products.json");

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
}

async function writeProducts(products: Product[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(products, null, 2), "utf8");
}

export async function getProducts(): Promise<Product[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw) as Product[];
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function addProduct(product: Product): Promise<void> {
  const products = await getProducts();
  products.push(product);
  await writeProducts(products);
}

export async function updateProduct(
  id: string,
  updates: Pick<Product, "title" | "price" | "description" | "images">,
): Promise<Product | undefined> {
  const products = await getProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return undefined;

  products[index] = { ...products[index], ...updates };
  await writeProducts(products);
  return products[index];
}

export async function setReservation(
  id: string,
  reservation: Reservation | null,
): Promise<Product | undefined> {
  const products = await getProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return undefined;

  products[index] = { ...products[index], reservedBy: reservation };
  await writeProducts(products);
  return products[index];
}

