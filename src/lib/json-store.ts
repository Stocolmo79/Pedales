// JSON documents in the PRIVATE R2 data bucket (may contain customer names/emails).
import { GetObjectCommand, PutObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { connection } from "next/server";
import { getS3Client } from "./storage";

const DATA_BUCKET = process.env.S3_DATA_BUCKET ?? "product-data";

export async function readJson<T>(key: string, fallback: T): Promise<{ data: T; etag: string | undefined }> {
  // Data is live; also the AWS SDK uses crypto.randomUUID(), which can't run during prerender.
  await connection();
  try {
    const res = await getS3Client().send(new GetObjectCommand({ Bucket: DATA_BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return { data: text ? (JSON.parse(text) as T) : fallback, etag: res.ETag };
  } catch (err) {
    if (err instanceof S3ServiceException && err.name === "NoSuchKey") {
      return { data: fallback, etag: undefined };
    }
    throw err;
  }
}

// Read-modify-write with an ETag precondition so concurrent writes aren't lost.
export async function mutateJson<T, R>(key: string, fallback: T, change: (data: T) => R): Promise<R> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await readJson(key, fallback);
    const result = change(data);
    try {
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: DATA_BUCKET,
          Key: key,
          Body: JSON.stringify(data, null, 2),
          ContentType: "application/json",
          ...(etag ? { IfMatch: etag } : { IfNoneMatch: "*" }),
        }),
      );
      return result;
    } catch (err) {
      if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 412) continue;
      throw err;
    }
  }
  throw new Error("No se pudo guardar. Inténtalo de nuevo.");
}
