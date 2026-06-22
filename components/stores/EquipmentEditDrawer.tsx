"use client";

import { useEffect } from "react";
import { X, Pencil } from "lucide-react";
import type { EquipmentDTO } from "@/lib/types";
import { EquipmentForm } from "@/components/catalog/EquipmentForm";

/**
 * Edit the underlying Equipment ("family") record from inside the store builder.
 * Because StoreItems reference the shared Equipment row, saving here updates the
 * item everywhere it is used. Mirrors the StoreDetailsDrawer shell.
 */
export function EquipmentEditDrawer({
  equipment,
  onClose,
  onSaved,
}: {
  equipment: EquipmentDTO;
  onClose: () => void;
  onSaved: (fd: FormData) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl animate-fade-in flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Pencil size={16} className="text-brand-500" /> Edit equipment · #
            {equipment.masterItemNo}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* body — the shared catalog form, embedded */}
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
          <p className="mb-4 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-700 ring-1 ring-inset ring-brand-100">
            Editing the shared equipment record — changes apply to every store that uses this item.
          </p>
          <EquipmentForm item={equipment} embedded onSaved={onSaved} onCancel={onClose} />
        </div>
      </aside>
    </div>
  );
}
