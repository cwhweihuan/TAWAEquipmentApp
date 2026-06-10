"use client";

import { useEffect } from "react";
import { X, FileText, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { EquipmentDTO } from "@/lib/types";
import { DeptChip } from "@/components/DeptChip";

function Spec({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}

export function DetailDrawer({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: EquipmentDTO | null;
  onClose: () => void;
  onEdit?: (item: EquipmentDTO) => void;
  onDelete?: (item: EquipmentDTO) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (item) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl animate-fade-in flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">
                #{item.masterItemNo}
              </span>
              {item.departments.map((d) => (
                <DeptChip key={d} dept={d} />
              ))}
            </div>
            <h2 className="truncate text-lg font-semibold text-gray-900">{item.description}</h2>
            {(item.manufacturer || item.model) && (
              <p className="text-sm text-gray-500">
                {[item.manufacturer, item.model].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item)}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Spec label="Supply by" value={item.supplyBy} />
            <Spec label="Install by" value={item.installBy} />
            <Spec label="Power" value={item.power} />
            <Spec label="Height" value={item.height} />
            <Spec label="NEMA" value={item.nema} />
            <Spec label="Data / Phone" value={item.dataPhone} />
            <Spec label="Water — cold" value={item.waterCold} />
            <Spec label="Water — hot" value={item.waterHot} />
            <Spec label="Water — elev." value={item.waterElev} />
            <Spec label="Gas — pipe" value={item.gasPipe} />
            <Spec label="Gas — BTU" value={item.gasBtu} />
            <Spec label="Gas — elev." value={item.gasElev} />
            <Spec label="Floor sink" value={item.floorSink} />
          </dl>

          {item.remarks && (
            <div className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
              <span className="font-medium">Remarks: </span>
              {item.remarks}
            </div>
          )}

          {/* PDF */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <FileText size={15} /> Spec sheet
              </h3>
              {item.pdfUrl && (
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  Open <ExternalLink size={12} />
                </a>
              )}
            </div>
            {item.pdfUrl ? (
              item.pdfDownloaded ? (
                <iframe
                  src={item.pdfUrl}
                  className="h-[60vh] w-full rounded-lg border border-gray-200"
                  title="Spec PDF"
                />
              ) : (
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-sm text-amber-700 hover:bg-amber-100"
                >
                  <ExternalLink size={16} /> View spec on Google Drive
                </a>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                No spec sheet attached
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
