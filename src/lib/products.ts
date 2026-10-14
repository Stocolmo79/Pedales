import { getSupabaseAdminClient } from "./supabase";

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

type ProductRow = {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[] | null;
  reserved_name: string | null;
  reserved_email: string | null;
  reserved_at: string | null;
};

function fromRow(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    description: row.description,
    images: row.images ?? [],
    reservedBy:
      row.reserved_name && row.reserved_email && row.reserved_at
        ? { name: row.reserved_name, email: row.reserved_email, reservedAt: row.reserved_at }
        : null,
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(fromRow);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const { data, error } = await getSupabaseAdminClient()
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? fromRow(data) : undefined;
}

export async function addProduct(product: Product): Promise<void> {
  const { error } = await getSupabaseAdminClient().from("products").insert({
    id: product.id,
    title: product.title,
    price: product.price,
    description: product.description,
    images: product.images,
  });
  if (error) throw new Error(error.message);
}

export async function updateProduct(
  id: string,
  updates: Pick<Product, "title" | "price" | "description" | "images">,
): Promise<Product | undefined> {
  const { data, error } = await getSupabaseAdminClient()
    .from("products")
    .update({
      title: updates.title,
      price: updates.price,
      description: updates.description,
      images: updates.images,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? fromRow(data) : undefined;
}

export async function setReservation(
  id: string,
  reservation: Reservation | null,
): Promise<Product | undefined> {
  const { data, error } = await getSupabaseAdminClient()
    .from("products")
    .update({
      reserved_name: reservation?.name ?? null,
      reserved_email: reservation?.email ?? null,
      reserved_at: reservation?.reservedAt ?? null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? fromRow(data) : undefined;
}


