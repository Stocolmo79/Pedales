import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { getProducts } from "@/lib/products";
import { clearReservation, logout } from "./actions";

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10">
      <Suspense fallback={<p className="text-zinc-500">Laddar…</p>}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

async function AdminContent() {
  const cookieStore = await cookies();
  if (!isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const products = await getProducts();
  const reserved = products.filter((product) => product.reservedBy);

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            &larr; A la página de productos
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reservas</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/ny"
            className="flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Añadir producto
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-500 hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {reserved.length === 0 ? (
        <p className="text-zinc-500">No hay reservas por el momento.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reserved.map((product) => (
            <li
              key={product.id}
              className="rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <h2 className="text-lg font-semibold">{product.title}</h2>
              <p className="text-sm text-zinc-500">${product.price}</p>
              <p className="mt-2 text-sm">
                Reservado por <strong>{product.reservedBy?.name}</strong> (
                {product.reservedBy?.email})
              </p>
              <p className="text-xs text-zinc-400">
                {product.reservedBy &&
                  new Date(product.reservedBy.reservedAt).toLocaleString("es-ES")}
              </p>
              <form action={clearReservation} className="mt-3">
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Cancelar reserva
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
