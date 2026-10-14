"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { discardUploadedImage, requestImageUploadUrl } from "./actions";

type UploadedImage = {
  url: string;
  status: "uploading" | "done" | "error";
};

export function ImageUploader({ fieldName }: { fieldName: string }) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(undefined);

    for (const file of Array.from(files)) {
      const result = await requestImageUploadUrl(file.type, file.size);
      if ("error" in result) {
        setError(result.error);
        continue;
      }

      const placeholder: UploadedImage = { url: result.publicUrl, status: "uploading" };
      setImages((current) => [...current, placeholder]);

      try {
        const response = await fetch(result.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("upload failed");

        setImages((current) =>
          current.map((img) =>
            img.url === result.publicUrl ? { ...img, status: "done" } : img,
          ),
        );
      } catch {
        setError("No se pudo subir una imagen. Inténtalo de nuevo.");
        setImages((current) => current.filter((img) => img.url !== result.publicUrl));
        discardUploadedImage(result.publicUrl);
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    setImages((current) => current.filter((img) => img.url !== url));
    discardUploadedImage(url);
  }

  const pendingUploads = images.some((img) => img.status === "uploading");

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-border">
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              {img.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                  …
                </div>
              )}
              {img.status === "done" && (
                <>
                  <input type="hidden" name={fieldName} value={img.url} />
                  <button
                    type="button"
                    onClick={() => removeImage(img.url)}
                    aria-label="Quitar imagen"
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={pendingUploads}
        onChange={(event) => handleFiles(event.target.files)}
        className="input disabled:opacity-60"
      />
    </div>
  );
}
