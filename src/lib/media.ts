import { supabase } from "@/lib/supabase";

export const BUCKETS = {
  media: "house-media",
  videos: "house-videos",
  docs: "landlord-docs",
} as const;
export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Shrinks big phone photos before upload to save the landlord's (and tenants') mobile data. */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // if the browser can't decode it, upload the original
  }
}

/** Reads a video's length in seconds in the browser. */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (isFinite(video.duration) && video.duration > 0) resolve(Math.round(video.duration));
      else reject(new Error("Could not read the video length"));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video format can't be read. Please use an MP4 file."));
    };
    video.src = url;
  });
}

const extOf = (file: File) => (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Builds "<userId>/<houseId>/<random>.<ext>" - the first folder MUST be the uploader's id (storage policy). */
export function buildPath(userId: string, scope: string, file: File) {
  return `${userId}/${scope}/${crypto.randomUUID()}.${extOf(file)}`;
}

/** Uploads with a progress callback (supabase-js upload() has none, which matters for 100MB videos). */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Please log in again.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "Upload failed";
      try {
        msg = JSON.parse(xhr.responseText).message || msg;
      } catch {
        /* keep default */
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    // Same multipart shape supabase-js uses
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

export const publicUrl = (bucket: BucketName, path: string) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

/** Recovers the storage path from a public URL so the file can be deleted. */
export function pathFromPublicUrl(bucket: BucketName, url: string) {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function removeFile(bucket: BucketName, url: string) {
  const path = pathFromPublicUrl(bucket, url);
  if (path) await supabase.storage.from(bucket).remove([path]);
}

export async function signedUrl(bucket: BucketName, path: string, seconds = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

/** Pixel size of an image file (used to check 360° photos are roughly 2:1). */
export async function getImageSize(file: File): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close?.();
  return size;
}
