"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  X,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  Ruler,
  CopyPlus,
  Loader2,
  Check,
} from "lucide-react";
import type { EquipmentDTO } from "@/lib/types";
import { BIM_STATUS_OPTIONS } from "@/lib/types";
import { DeptChip } from "@/components/DeptChip";
import { updateEquipmentDimension, duplicateEquipment } from "@/app/actions/equipment";
import { EquipmentForm } from "./EquipmentForm";

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
  onDelete,
  onPrevious,
  onNext,
  position,
  total,
}: {
  item: EquipmentDTO | null;
  onClose: () => void;
  onDelete?: (item: EquipmentDTO) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  position?: number;
  total?: number;
}) {
  const router = useRouter();
  const [dim, setDim] = useState(item?.dimension ?? "");
  const [dimMsg, setDimMsg] = useState<string | null>(null);
  const [savingDim, startSaveDim] = useTransition();
  const [dupOpen, setDupOpen] = useState(false);
  const [dupName, setDupName] = useState(item?.description ?? "");
  const [dupDim, setDupDim] = useState(item?.dimension ?? "");
  const [duping, startDup] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (
        !isEditing &&
        !(e.target instanceof HTMLElement && e.target.matches("input, textarea, select, [contenteditable='true']"))
      ) {
        if (e.key === "ArrowLeft") onPrevious?.();
        if (e.key === "ArrowRight") onNext?.();
      }
    };
    if (item) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [item, isEditing, onClose, onPrevious, onNext]);

  if (!item) return null;
  const equip = item;

  function saveDim() {
    startSaveDim(async () => {
      await updateEquipmentDimension(equip.id, dim);
      setDimMsg("Saved");
      router.refresh();
    });
  }

  function doDuplicate() {
    startDup(async () => {
      await duplicateEquipment(equip.id, { description: dupName, dimension: dupDim });
      router.refresh();
      onClose();
    });
  }

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
            {!isEditing && typeof position === "number" && typeof total === "number" && total > 1 && (
              <>
                <span className="px-1 text-xs tabular-nums text-gray-400">
                  {position} / {total}
                </span>
                <button
                  onClick={onPrevious}
                  disabled={position <= 1}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Previous equipment (←)"
                  aria-label="Previous equipment"
                >
                  <ArrowLeft size={17} />
                </button>
                <button
                  onClick={onNext}
                  disabled={position >= total}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Next equipment (→)"
                  aria-label="Next equipment"
                >
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {!isEditing && (
              <button
                onClick={() => setDupOpen((v) => !v)}
                className="rounded-lg p-2 text-gray-400 hover:bg-brand-50 hover:text-brand-700"
                title="Duplicate as a variant (shares this spec sheet)"
              >
                <CopyPlus size={16} />
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Edit equipment"
                aria-label="Edit equipment"
              >
                <Pencil size={16} />
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
            {onDelete && !isEditing && (
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
          {isEditing ? (
            <EquipmentForm
              item={item}
              embedded
              onSaved={(fd) => {
                const dimension = fd.get("dimension");
                setDim(typeof dimension === "string" ? dimension : "");
                setDimMsg(null);
                setIsEditing(false);
                router.refresh();
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              {/* duplicate-as-variant panel */}
              {dupOpen && (
            <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/50 p-4 animate-fade-in">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <CopyPlus size={15} /> Duplicate as a variant
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Creates a new item sharing this spec sheet — give it its own name and size.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600">Variant name</span>
                  <input
                    value={dupName}
                    onChange={(e) => setDupName(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600">Dimension</span>
                  <input
                    value={dupDim}
                    onChange={(e) => setDupDim(e.target.value)}
                    placeholder='e.g. 36"W x 30"D x 36"H'
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setDupOpen(false)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={doDuplicate}
                  disabled={duping}
                  className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand-200 hover:bg-brand-700 disabled:opacity-60"
                >
                  {duping && <Loader2 size={14} className="animate-spin" />} Create variant
                </button>
              </div>
            </div>
              )}

              {/* dimension — quick inline editor */}
              <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <Ruler size={13} /> Dimension
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={dim}
                onChange={(e) => {
                  setDim(e.target.value);
                  setDimMsg(null);
                }}
                placeholder='e.g. 48"W x 30"D x 36"H'
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                onClick={saveDim}
                disabled={savingDim || dim === (item.dimension ?? "")}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {savingDim ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
            </div>
            {dimMsg && <p className="mt-1 text-xs text-gray-500">{dimMsg}</p>}
              </div>

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
              {item.specUrl && (
                <a
                  href={item.specUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  Official product page <ExternalLink size={12} />
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
              <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Box size={15} className="text-brand-600" /> 3D / BIM model
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                {BIM_STATUS_OPTIONS.find((status) => status.value === item.bimStatus)?.label ?? "未建立"}
              </span>
            </div>
            {item.bimModelUrl ? (
              <a
                href={item.bimModelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-brand-200 bg-white px-4 py-5 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <Box size={20} /> Open 3D Preview <ExternalLink size={14} />
              </a>
            ) : (
              <p className="rounded-lg border border-dashed border-brand-200 bg-white px-4 py-5 text-center text-sm text-gray-500">
                No BIM / 3D model URL added
              </p>
            )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
