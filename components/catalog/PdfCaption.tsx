import { pdfDisplayName } from "@/lib/equipment-search";
import { cn, sentenceCase } from "@/lib/utils";

export function PdfCaption({ filename, className }: { filename: string | null; className?: string }) {
  if (!filename) return null;
  return (
    <p title={filename} className={cn("line-clamp-2 break-words text-[11px] leading-snug text-gray-400", className)}>
      PDF · {sentenceCase(pdfDisplayName(filename))}
    </p>
  );
}
