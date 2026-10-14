"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") {
        setActive((current) => (current + 1) % images.length);
      }
      if (event.key === "ArrowLeft") {
        setActive((current) => (current - 1 + images.length) % images.length);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-400 dark:bg-zinc-800">
        Sin imagen
      </div>
    );
  }

  function showPrevious() {
    setActive((current) => (current - 1 + images.length) % images.length);
  }

  function showNext() {
    setActive((current) => (current + 1) % images.length);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative block h-96 w-full cursor-zoom-in overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
      >
        <Image
          src={images[active]}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 768px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Mostrar imagen ${i + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-opacity ${
                i === active
                  ? "ring-accent"
                  : "opacity-60 ring-transparent hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            &times;
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPrevious();
              }}
              aria-label="Imagen anterior"
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              &#8249;
            </button>
          )}

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-full max-h-[85vh] w-full max-w-4xl"
          >
            <Image
              src={images[active]}
              alt={title}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
              aria-label="Imagen siguiente"
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              &#8250;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
