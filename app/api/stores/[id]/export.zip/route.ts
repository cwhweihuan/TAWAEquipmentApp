import JSZip from "jszip";
import { getStore, pdfUrlFor } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore(id);
  if (!store) return new Response("Not found", { status: 404 });

  const byFloorPlan = new URL(req.url).searchParams.get("numbering") === "floor-plan";
  const width = Math.max(2, String(store.items.length).length);
  const entries = store.items.map((item, index) => ({
    item,
    number: byFloorPlan ? item.scheduleNo?.trim() || "" : String(index + 1).padStart(width, "0"),
  }));
  if (byFloorPlan) {
    const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    entries.sort((a, b) => Number(!a.number) - Number(!b.number) || collator.compare(a.number, b.number));
  }

  const zip = new JSZip();
  const seen = new Set<string>();
  const files = new Map<string, Buffer>();
  const filenames = new Set<string>();
  let count = 0;

  for (const { item, number } of entries) {
    const eq = item.equipment;
    const pdf = eq?.pdf;
    if (!pdf?.storagePath) continue;
    const key = byFloorPlan ? JSON.stringify([pdf.id, number]) : pdf.id;
    if (seen.has(key)) continue;
    const url = pdfUrlFor(pdf);
    if (!url) continue;
    try {
      let buf = files.get(pdf.id);
      if (!buf) {
        const res = await fetch(url);
        if (!res.ok) continue;
        buf = Buffer.from(await res.arrayBuffer());
        files.set(pdf.id, buf);
      }
      const prefix = number.replace(/^#\s*/, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim() || "Unnumbered";
      const safe = (eq?.description ?? "spec")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .slice(0, 50)
        .trim();
      const stem = `${prefix}-${safe || "spec"}`;
      let filename = `${stem}.pdf`;
      for (let suffix = 2; filenames.has(filename.toLowerCase()); suffix++) {
        filename = `${stem} (${suffix}).pdf`;
      }
      zip.file(filename, buf);
      filenames.add(filename.toLowerCase());
      seen.add(key);
      count++;
    } catch {
      // skip unreachable files
    }
  }

  if (count === 0) {
    return new Response("No stored spec PDFs to bundle for this store.", { status: 404 });
  }

  const blob = await zip.generateAsync({ type: "nodebuffer" });
  const fname = `Store-${store.number}-specs${byFloorPlan ? "-floor-plan" : ""}.zip`;
  return new Response(blob as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
