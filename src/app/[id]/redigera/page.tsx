import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { getProduct } from "@/lib/products";
import { EditProductForm } from "./edit-product-form";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12 sm:px-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Volver a productos
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tight">
        Editar producto
      </h1>
      <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
        <EditProductFormLoader params={params} />
      </Suspense>
    </div>
  );
}

async function EditProductFormLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
