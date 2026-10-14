"use client";

import { useActionState } from "react";
import { createProduct } from "../actions";

const initialState = undefined;

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Título</span>
        <input
          name="title"
          type="text"
          required
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Precio ($)</span>
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Descripción</span>
        <textarea
          name="description"
          required
          rows={4}
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Galería de imágenes</span>
        <input
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending ? "Guardando…" : "Guardar producto"}
      </button>
    </form>
  );
}
