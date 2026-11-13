"use client";

import { sentenceCase } from "@/lib/utils";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { StoreItemDTO } from "@/lib/types";

export function CustomItemPreviewDrawer({ item, onClose }: {
  item: StoreItemDTO;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="custom-preview-title" className="relative flex h-full w-full max-w-2xl animate-fade-in flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <p className="mb-1 text-xs text-gray-500">Custom equipment</p>
            <h2 id="custom-preview-title" className="text-lg font-semibold text-gray-900">{sentenceCase(item.description)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Manufacturer", item.manufacturer],
              ["Model", item.model],
              ["Dimension", item.dimension],
              ["Quantity", String(item.quantity)],
              ["Room", item.room],
              ["Status", item.proposeNew],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{sentenceCase(label)}</dt>
                <dd className="text-sm text-gray-800">{sentenceCase(value) || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">No spec sheet attached</p>
        </div>
      </aside>
    </div>
  );
}
