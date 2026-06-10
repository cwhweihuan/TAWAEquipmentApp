import JSZip from "jszip";
import { getStore, pdfUrlFor } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) return new Response("Not found", { status: 404 });

  const zip = new JSZip();
  const seen = new Set<string>();
  let count = 0;

  for (let i = 0; i < store.items.length; i++) {
    const eq = store.items[i].equipment;
    const pdf = eq?.pdf;
    if (!pdf || !pdf.storagePath || seen.has(pdf.id)) continue;
    seen.add(pdf.id);
    const url = pdfUrlFor(pdf);
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const safe = (eq?.description ?? "spec")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .slice(0, 50)
        .trim();
      zip.file(`${String(i + 1).padStart(2, "0")}-${safe}.pdf`, buf);
      count++;
    } catch {
      // skip unreachable files
    }
  }

  if (count === 0) {
    return new Response("No stored spec PDFs to bundle for this store.", { status: 404 });
  }

  const blob = await zip.generateAsync({ type: "nodebuffer" });
  const fname = `Store-${store.number}-specs.zip`;
  return new Response(blob as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
