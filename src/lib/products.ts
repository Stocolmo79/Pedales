// Products are stored as one JSON document in the private R2 data bucket.
import { isCategory, type Category } from "./categories";
import { mutateJson, readJson } from "./json-store";

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
  category: Category;
  reservedBy: Reservation | null;
  waitlist: WaitlistEntry[];
};

const KEY = "products.json";

function mutate<T>(change: (products: Product[]) => T): Promise<T> {
  return mutateJson<Product[], T>(KEY, [], change);
}

// Products saved before categories existed get one guessed from the title.
function guessCategory(title: string): Category {
  return /\bvinilo\b|\bLP\b/i.test(title) ? "lp" : "pedal";
}

function normalize(product: Product): Product {
  return {
    ...product,
    images: product.images ?? [],
    category: isCategory(product.category) ? product.category : guessCategory(product.title),
    reservedBy: product.reservedBy ?? null,
    waitlist: product.waitlist ?? [],
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data } = await readJson<Product[]>(KEY, []);
  return data.map(normalize);
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
  updates: Pick<Product, "title" | "price" | "description" | "images" | "category">,
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
