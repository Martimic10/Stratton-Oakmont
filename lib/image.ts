const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function convertHeicClientSide(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  return Array.isArray(result) ? result[0] : result;
}

async function loadImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function downscaleToJpeg(bitmap: ImageBitmap): Promise<Blob> {
  const { width, height } = bitmap;
  const longestSide = Math.max(width, height);
  const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode image"));
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

/**
 * Prepares a photo for upload: converts HEIC/HEIF to JPEG client-side (with a
 * server-side sharp fallback handled by the API route if this throws), then
 * downscales to keep uploads fast and under API image size limits.
 */
export async function prepareImageForUpload(file: File): Promise<{ blob: Blob; fileName: string }> {
  let workingBlob: Blob = file;
  let usedHeicFallback = false;

  if (isHeic(file)) {
    try {
      workingBlob = await convertHeicClientSide(file);
    } catch {
      // Let the server route attempt sharp-based conversion instead.
      usedHeicFallback = true;
    }
  }

  if (usedHeicFallback) {
    return { blob: file, fileName: file.name };
  }

  try {
    const bitmap = await loadImageBitmap(workingBlob);
    const downscaled = await downscaleToJpeg(bitmap);
    bitmap.close();
    return { blob: downscaled, fileName: file.name.replace(/\.[^.]+$/, ".jpg") };
  } catch {
    // If downscaling fails for any reason, fall back to the converted (or original) blob as-is.
    return { blob: workingBlob, fileName: file.name };
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}
