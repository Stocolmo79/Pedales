"use client";

import { useTransition } from "react";
import { moveProductOrder } from "./actions";

export function ProductOrderButtons({
  productId,
  isFirst,
  isLast,
}: {
  productId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={isFirst || isPending}
        onClick={() => startTransition(() => moveProductOrder(productId, "up"))}
        className="rounded-full border border-black/[.08] px-2 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        aria-label="Subir producto"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={isLast || isPending}
        onClick={() => startTransition(() => moveProductOrder(productId, "down"))}
        className="rounded-full border border-black/[.08] px-2 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        aria-label="Bajar producto"
      >
        ↓
      </button>
    </div>
  );
}
