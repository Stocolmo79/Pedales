"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { recordView, toggleLike } from "./actions";
import type { ProductStats } from "@/lib/stats";

export function ProductEngagement({
  productId,
  initialStats,
  initialLiked,
}: {
  productId: string;
  initialStats: ProductStats;
  initialLiked: boolean;
}) {
  const [stats, setStats] = useState(initialStats);
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Count a view once per browser session, when the product is actually scrolled into view.
  useEffect(() => {
    const storageKey = `viewed:${productId}`;
    if (sessionStorage.getItem(storageKey) || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        sessionStorage.setItem(storageKey, "1");
        recordView(productId).then((next) => next && setStats(next));
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [productId]);

  function handleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setStats((s) => ({ ...s, likes: Math.max(0, s.likes + (nextLiked ? 1 : -1)) }));
    startTransition(async () => {
      const result = await toggleLike(productId);
      if (result) {
        setLiked(result.liked);
        setStats(result.stats);
      }
    });
  }

  return (
    <div ref={ref} className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
      <button
        type="button"
        onClick={handleLike}
        disabled={isPending}
        aria-pressed={liked}
        aria-label={liked ? "Quitar me gusta" : "Me gusta"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors disabled:opacity-60 ${
          liked
            ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
            : "border-black/[.08] hover:text-rose-500 dark:border-white/[.145]"
        }`}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span>
        {stats.likes}
      </button>
      <span className="inline-flex items-center gap-1.5" title="Visitas">
        <span aria-hidden>👁</span>
        {stats.views} {stats.views === 1 ? "visita" : "visitas"}
      </span>
    </div>
  );
}
