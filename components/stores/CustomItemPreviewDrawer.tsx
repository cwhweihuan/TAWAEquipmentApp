"use client";

import { isOmittedStoreItem, sentenceCase, splitStoreSpecSource } from "@/lib/utils";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Pencil, X } from "lucide-react";
import type { StoreItemDTO } from "@/lib/types";

export function CustomItemPreviewDrawer({ item, onClose, onEdit, onConvert, onPrevious, onNext, position, total, children }: {
  item: StoreItemDTO;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => Promise<string | undefined>;
  onPrevious: () => void;
  onNext: () => void;
  position: number;
  total: number;
  children?: ReactNode;
}) {
  const [converting, startConversion] = useTransition();
  const [conversionError, setConversionError] = useState<string>();

  function convert() {
    setConversionError(undefined);
    startConversion(async () => {
      try {
        setConversionError(await onConvert());
      } catch {
        setConversionError("Could not convert this item. Please try again.");
      }
    });
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (!(event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']"))) {
        if (event.key === "ArrowLeft") onPrevious();
        if (event.key === "ArrowRight") onNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrevious, onNext]);

  const { remarks, specSource } = splitStoreSpecSource(item.remarks);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="custom-preview-title" className="relative flex h-full w-full animate-fade-in flex-col bg-white shadow-2xl lg:w-2/3">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <p className="mb-1 text-xs text-gray-500">Custom equipment</p>
            <h2 id="custom-preview-title" className="text-lg font-semibold text-gray-900">{item.description.toUpperCase()}</h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">{position} / {total}</span>
            <button type="button" onClick={onPrevious} disabled={position <= 1} aria-label="Previous equipment" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowLeft size={17} /></button>
            <button type="button" onClick={onNext} disabled={position >= total} aria-label="Next equipment" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowRight size={17} /></button>
            <button type="button" onClick={onEdit} aria-label="Edit custom item" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Pencil size={16} /></button>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          {!isOmittedStoreItem(item) && !item.id.startsWith("temp-") && (
            <button
              type="button"
              onClick={convert}
              disabled={converting}
              className="mb-4 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {converting ? "Converting…" : "Convert to Catalog Equipment"}
            </button>
          )}
          {conversionError && <p role="alert" className="mb-4 text-sm text-red-600">{conversionError}</p>}
          {children}
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Manufacturer", item.manufacturer],
              ["Model", item.model],
              ["Dimension", item.dimension],
              ["Quantity", String(item.quantity)],
              ["Rooms", item.rooms.join(", ")],
              ["Status", item.proposeNew],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{sentenceCase(label)}</dt>
                <dd className="text-sm text-gray-800">{(label === "Dimension" ? value : sentenceCase(value)) || "—"}</dd>
              </div>
            ))}
          </dl>
          {remarks && (
            <div className="mt-5 whitespace-pre-wrap break-words rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
              <span className="font-medium">Remarks: </span>{remarks}
            </div>
          )}
          {specSource ? (
            <a href={specSource} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-sm font-medium text-brand-700 underline">
              View specification source
            </a>
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">No spec sheet attached</p>
          )}
        </div>
      </aside>
    </div>
  );
}
