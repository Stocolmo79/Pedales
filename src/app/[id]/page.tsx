import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAdminSession } from "@/lib/admin-auth";
import { LIKED_COOKIE, parseLikedCookie } from "@/lib/liked-cookie";
import { getProduct } from "@/lib/products";
import { getStats } from "@/lib/stats";
import { ProductEngagement } from "../product-engagement";
import { ProductGallery } from "../product-gallery";
import { ReserveForm } from "../reserve-form";
import { WaitlistForm } from "../waitlist-form";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-8">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Volver a productos
      </Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Cargando producto…</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, isAdmin, stats, cookieStore] = await Promise.all([
    getProduct(id),
    isAdminSession(),
    getStats().catch((): Awaited<ReturnType<typeof getStats>> => ({})),
    cookies(),
  ]);
  if (!product) notFound();

  const liked = parseLikedCookie(cookieStore.get(LIKED_COOKIE)?.value).has(product.id);

  return (
    <article className="card mt-6 p-5 sm:p-6">
      <ProductGallery images={product.images} title={product.title} />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
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
      <ProductEngagement
        productId={product.id}
        initialStats={stats[product.id] ?? { likes: 0, views: 0 }}
        initialLiked={liked}
      />
      {!product.reservedBy ? (
        <ReserveForm productId={product.id} />
      ) : (
        <WaitlistForm productId={product.id} />
      )}
      {isAdmin && (
        <Link
          href={`/${product.id}/redigera`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-accent"
        >
          Editar producto
        </Link>
      )}
    </article>
  );
}
