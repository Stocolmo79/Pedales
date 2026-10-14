import Link from "next/link";
import { Suspense } from "react";
import { isAdminSession } from "@/lib/admin-auth";
import { getProducts } from "@/lib/products";
import { ProductGallery } from "./product-gallery";
import { ReserveForm } from "./reserve-form";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-8">
      <Suspense fallback={<p className="text-zinc-500">Cargando productos…</p>}>
        <ProductsSection />
      </Suspense>
      <div className="mt-12 text-center">
        <Link
          href="/admin"
          className="text-xs font-medium text-zinc-400 transition-colors hover:text-accent"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}

async function ProductsSection() {
  const [isAdmin, products] = await Promise.all([isAdminSession(), getProducts()]);

  return (
    <>
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Explora el catálogo disponible y reserva lo que te interese.
          </p>
        </div>
      </div>
      {products.length === 0 ? (
        <p className="card px-6 py-10 text-center text-zinc-500">Aún no hay productos.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {products
            .slice()
            .reverse()
            .map((product) => (
              <li key={product.id} className="card p-5 sm:p-6">
                <ProductGallery images={product.images} title={product.title} />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{product.title}</h2>
                    <p className="mt-1 text-lg font-semibold text-accent">${product.price}</p>
                  </div>
                  {product.reservedBy && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Reservado
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                  {product.description}
                </p>
                {!product.reservedBy && <ReserveForm productId={product.id} />}
                {isAdmin && (
                  <Link
                    href={`/${product.id}/redigera`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-accent"
                  >
                    Editar producto
                  </Link>
                )}
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
