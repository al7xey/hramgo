import { env } from "@/lib/env";

export function getUploadLimits() {
  return {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxPhotos: env.MAX_REVIEW_PHOTOS,
    maxSizeMb: env.MAX_UPLOAD_SIZE_MB
  };
}

export async function createPresignedUploadUrl(input: { fileName: string; contentType: string }) {
  const limits = getUploadLimits();

  if (!limits.allowedMimeTypes.includes(input.contentType)) {
    throw new Error("Неподдерживаемый тип файла");
  }

  if (!env.S3_BUCKET || !env.S3_ENDPOINT) {
    throw new Error("S3 storage is not configured");
  }

  return {
    uploadUrl: "",
    publicUrl: `${env.S3_PUBLIC_URL}/${input.fileName}`,
    storageKey: input.fileName
  };
}
