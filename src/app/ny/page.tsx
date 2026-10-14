import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { NewProductForm } from "./new-product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12 sm:px-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Volver a productos
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tight">
        Añadir producto
      </h1>
      <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
        <NewProductGate />
      </Suspense>
    </div>
  );
}

async function NewProductGate() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  return <NewProductForm />;
}
