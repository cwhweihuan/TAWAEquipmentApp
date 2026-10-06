"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Pencil, Loader2, Ruler } from "lucide-react";
import type { StoreItemDTO } from "@/lib/types";
import { updateCustomItem, type CustomItemFields } from "@/app/actions/store";

/**
 * Edit a custom (non-catalog) store line item in place.
 * Custom rows have no shared Equipment record, so their description /
 * manufacturer / model / dimension live on the StoreItem row itself and only
 * affect this store. Mirrors the EquipmentEditDrawer shell.
 */
export function CustomItemEditDrawer({
  item,
  onClose,
  onSaved,
}: {
  item: StoreItemDTO;
  onClose: () => void;
  onSaved: (fields: CustomItemFields) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => {
      const v = (fd.get(k) as string | null)?.trim();
      return v ? v : null;
    };
    const fields: CustomItemFields = {
      description: val("description") ?? "",
      manufacturer: val("manufacturer"),
      model: val("model"),
      dimension: val("dimension"),
    };
    start(async () => {
      try {
        await updateCustomItem(item.id, fields);
        onSaved(fields);
      } catch (err) {
        setError((err as Error).message || "Something went wrong");
      }
    });
  }

  const inputCls =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl animate-fade-in flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Pencil size={16} className="text-brand-500" /> Edit custom item
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
          <p className="mb-4 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-700 ring-1 ring-inset ring-brand-100">
            This item is not linked to the catalog — changes apply to this store only.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">
                Description <span className="text-red-500">*</span>
              </span>
              <input
                name="description"
                defaultValue={item.description}
                required
                autoFocus
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Manufacturer</span>
                <input name="manufacturer" defaultValue={item.manufacturer ?? ""} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Model</span>
                <input name="model" defaultValue={item.model ?? ""} className={inputCls} />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <Ruler size={12} /> Dimension
              </span>
              <input
                name="dimension"
                defaultValue={item.dimension ?? ""}
                placeholder='e.g. 48"W x 30"D x 36"H'
                className={inputCls}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
