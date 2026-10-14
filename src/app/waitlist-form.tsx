"use client";

import { useActionState } from "react";
import { joinWaitlist } from "./actions";

export function WaitlistForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    joinWaitlist.bind(null, productId),
    undefined,
  );

  if (state?.success) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        Te hemos apuntado a la lista de espera. Te avisaremos si se libera.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        Este producto ya está reservado. Apúntate a la lista de espera:
      </p>
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <input
        name="name"
        type="text"
        placeholder="Nombre"
        required
        className="input"
      />
      <input
        name="email"
        type="email"
        placeholder="Correo electrónico"
        required
        className="input"
      />
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Enviando…" : "Unirme a la lista de espera"}
      </button>
    </form>
  );
}
