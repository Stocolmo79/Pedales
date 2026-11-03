import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { isAdminSession } from "@/lib/admin-auth";
import { CATEGORIES, isCategory, type Category } from "@/lib/categories";
import { getProducts } from "@/lib/products";
import { getStats } from "@/lib/stats";
import { ProductOrderButtons } from "./product-order-buttons";

type SearchParams = Promise<{ categoria?: string | string[] }>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-8">
      <p className="mb-8 rounded-lg bg-accent/10 px-4 py-3 text-center text-sm font-medium text-accent">
        Estos productos estarán disponibles en Chile a partir del 15 de diciembre. Se atiende por orden de reservación.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Cargando productos…</p>}>
        <ProductsSection searchParams={searchParams} />
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

async function ProductsSection({ searchParams }: { searchParams: SearchParams }) {
  const [isAdmin, allProducts, stats, { categoria }] = await Promise.all([
    isAdminSession(),
    getProducts(),
    getStats().catch((): Awaited<ReturnType<typeof getStats>> => ({})),
    searchParams,
  ]);
  const category: Category | undefined = isCategory(categoria) ? categoria : undefined;
  const products = category ? allProducts.filter((p) => p.category === category) : allProducts;
  const filters: { href: string; label: string; active: boolean }[] = [
    { href: "/", label: "Todos", active: !category },
    ...Object.entries(CATEGORIES).map(([value, label]) => ({
      href: `/?categoria=${value}`,
      label,
      active: category === value,
    })),
  ];

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
      <nav aria-label="Categorías" className="-mt-4 mb-8 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter.active
                ? "border-accent bg-accent text-white"
                : "border-black/[.08] text-zinc-500 hover:text-accent dark:border-white/[.145]"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p className="card px-6 py-10 text-center text-zinc-500">Aún no hay productos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products
            .slice()
            .reverse()
            .map((product, index, reversedProducts) => (
              <li key={product.id} className="card flex flex-col overflow-hidden">
                <Link href={`/${product.id}`} className="group flex flex-1 flex-col">
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-zinc-400">
                        Sin imagen
                      </span>
                    )}
                    {product.reservedBy && (
                      <span className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Reservado
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">
                      {product.title}
                    </h2>
                    <div className="mt-auto flex items-center justify-between pt-1 text-sm">
                      <span className="font-semibold text-accent">${product.price}</span>
                      <span className="text-xs text-zinc-500">♥ {stats[product.id]?.likes ?? 0}</span>
                    </div>
                  </div>
                </Link>
                {/* Reordering swaps with neighbours in the full list, so only offer it unfiltered. */}
                {isAdmin && !category && (
                  <div className="flex justify-center border-t border-black/[.06] p-2 dark:border-white/[.08]">
                    <ProductOrderButtons
                      productId={product.id}
                      isFirst={index === 0}
                      isLast={index === reversedProducts.length - 1}
                    />
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
