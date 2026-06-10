/**
 * Supabase Storage helpers via the REST API (no @supabase/supabase-js client).
 * Avoids the realtime/WebSocket dependency, so it runs on any Node version
 * (local Node 20.9 and Vercel alike).
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "pdfs";

function adminHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY!}`,
    ...extra,
  };
}

/** Public URL for a stored PDF object. */
export function pdfPublicUrl(storagePath: string) {
  return `${URL}/storage/v1/object/public/${PDF_BUCKET}/${storagePath}`;
}

/** Create the PDF bucket (public) if it does not already exist. */
export async function ensurePdfBucket() {
  const res = await fetch(`${URL}/storage/v1/bucket`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: PDF_BUCKET, name: PDF_BUCKET, public: true }),
  });
  // 200 = created, 409 = already exists — both fine
  if (!res.ok && res.status !== 409) {
    const txt = await res.text();
    if (!txt.includes("already exists")) {
      throw new Error(`ensurePdfBucket failed (${res.status}): ${txt}`);
    }
  }
}

/** Upload (upsert) a PDF to the bucket. Returns the storage path. */
export async function uploadPdf(path: string, bytes: Uint8Array | Buffer): Promise<string> {
  const res = await fetch(`${URL}/storage/v1/object/${PDF_BUCKET}/${path}`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/pdf", "x-upsert": "true" }),
    body: bytes as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`uploadPdf failed (${res.status}): ${await res.text()}`);
  }
  return path;
}

/** Delete a stored PDF (best-effort). */
export async function deletePdf(path: string) {
  await fetch(`${URL}/storage/v1/object/${PDF_BUCKET}/${path}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}
