"use client";

import { useEffect } from "react";
import { X, FileText, ExternalLink } from "lucide-react";

export type PreviewTarget = {
  title: string;
  subtitle?: string | null;
  url: string;
  /** stored (inline-viewable) vs. an external link (e.g. Google Drive) */
  downloaded: boolean;
};

/** A right-side slide-out that previews a PDF inline (or links out if not stored). */
export function PdfPreviewDrawer({
  target,
  onClose,
}: {
  target: PreviewTarget | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (target) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl animate-fade-in flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 truncate text-base font-semibold text-gray-900">
              <FileText size={16} className="shrink-0 text-brand-500" /> {target.title}
            </h2>
            {target.subtitle && (
              <p className="truncate text-sm text-gray-500">{target.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Open <ExternalLink size={12} />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-50 p-3">
          {target.downloaded ? (
            <iframe
              src={target.url}
              className="h-full w-full rounded-lg border border-gray-200 bg-white"
              title={target.title}
            />
          ) : (
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 text-sm text-amber-700 hover:bg-amber-100"
            >
              <ExternalLink size={16} /> Open spec on Google Drive
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}
