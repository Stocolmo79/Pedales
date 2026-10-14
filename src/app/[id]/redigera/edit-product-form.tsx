"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { updateProduct } from "../../actions";
import { ImageUploader } from "../../image-uploader";
import type { Product } from "@/lib/products";

export function EditProductForm({ product }: { product: Product }) {
  const [state, formAction, pending] = useActionState(
    updateProduct.bind(null, product.id),
    undefined,
  );
  const [keptImages, setKeptImages] = useState(product.images);

  function toggleImage(image: string) {
    setKeptImages((current) =>
      current.includes(image)
        ? current.filter((img) => img !== image)
        : [...current, image],
    );
  }

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
          defaultValue={product.title}
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
          defaultValue={product.price}
          required
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Descripción</span>
        <textarea
          name="description"
          defaultValue={product.description}
          required
          rows={4}
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>

      {product.images.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Imágenes actuales</span>
          <div className="flex flex-wrap gap-3">
            {product.images.map((image) => {
              const kept = keptImages.includes(image);
              return (
                <label key={image} className="flex flex-col items-center gap-1">
                  <div
                    className={`relative h-20 w-20 overflow-hidden rounded-lg border ${
                      kept
                        ? "border-black/[.08] dark:border-white/[.145]"
                        : "border-red-400 opacity-40"
                    }`}
                  >
                    <Image src={image} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <input
                    type="checkbox"
                    name="keepImages"
                    value={image}
                    checked={kept}
                    onChange={() => toggleImage(image)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-zinc-500">Mantener</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Añadir más imágenes</span>
        <ImageUploader fieldName="imageUrls" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
