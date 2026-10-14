"use client";

import { useActionState } from "react";
import { reserveProduct } from "./actions";

export function ReserveForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    reserveProduct.bind(null, productId),
    undefined,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <input
        name="name"
        type="text"
        placeholder="Nombre"
        required
        className="rounded-lg border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
      />
      <input
        name="email"
        type="email"
        placeholder="Correo electrónico"
        required
        className="rounded-lg border border-black/[.08] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        {pending ? "Reservando…" : "Reservar"}
      </button>
    </form>
  );
}
