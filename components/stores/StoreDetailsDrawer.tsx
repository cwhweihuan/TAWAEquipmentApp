"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  X,
  Loader2,
  Upload,
  FileText,
  Trash2,
  Plus,
  Eye,
  Store as StoreIcon,
} from "lucide-react";
import type { Subtenant } from "@/lib/types";
import { updateStoreDetails, uploadFloorplan, removeFloorplan } from "@/app/actions/store";
import type { PreviewTarget } from "./PdfPreviewDrawer";

type Editable = {
  id: string;
  name: string;
  number: string;
  location: string | null;
  floorplanUrl: string | null;
  floorplanName: string | null;
  subtenants: Subtenant[];
};

export function StoreDetailsDrawer({
  store,
  onClose,
  onSaved,
  onPreview,
}: {
  store: Editable;
  onClose: () => void;
  onSaved: (patch: Partial<Editable>) => void;
  onPreview: (t: PreviewTarget) => void;
}) {
  const [name, setName] = useState(store.name);
  const [number, setNumber] = useState(store.number);
  const [location, setLocation] = useState(store.location ?? "");
  const [subtenants, setSubtenants] = useState<Subtenant[]>(
    store.subtenants.length ? store.subtenants : []
  );
  const [floorplanUrl, setFloorplanUrl] = useState(store.floorplanUrl);
  const [floorplanName, setFloorplanName] = useState(store.floorplanName);

  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function setSub(i: number, p: Partial<Subtenant>) {
    setSubtenants((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...p } : s)));
  }
  const addSub = () => setSubtenants((cur) => [...cur, { no: "", name: "" }]);
  const removeSub = (i: number) => setSubtenants((cur) => cur.filter((_, idx) => idx !== i));

  function save() {
    startSave(async () => {
      const cleaned = subtenants
        .map((s) => ({ no: s.no.trim(), name: s.name.trim() }))
        .filter((s) => s.no || s.name);
      await updateStoreDetails(store.id, { name, number, location, subtenants: cleaned });
      onSaved({ name, number, location: location || null, subtenants: cleaned });
      onClose();
    });
  }

  async function onFloorplanChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("floorplan", file);
      const { url, name: fname } = await uploadFloorplan(store.id, fd);
      setFloorplanUrl(url);
      setFloorplanName(fname);
      onSaved({ floorplanUrl: url, floorplanName: fname });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function dropFloorplan() {
    await removeFloorplan(store.id);
    setFloorplanUrl(null);
    setFloorplanName(null);
    onSaved({ floorplanUrl: null, floorplanName: null });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg animate-fade-in flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <StoreIcon size={17} className="text-brand-500" /> Store details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* basics */}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Store name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bellevue Flagship"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Store number</span>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Address / location</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="SEATTLE, WA"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          {/* floor plan */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Floor plan (PDF)</h3>
            {floorplanUrl ? (
              <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                <FileText size={18} className="shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {floorplanName ?? "floor-plan.pdf"}
                </span>
                <button
                  onClick={() =>
                    onPreview({
                      title: "Floor plan",
                      subtitle: floorplanName,
                      url: floorplanUrl,
                      downloaded: true,
                    })
                  }
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  onClick={dropFloorplan}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Remove floor plan"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 hover:bg-gray-100">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Uploading…" : "Upload floor-plan PDF"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={onFloorplanChosen}
                />
              </label>
            )}
          </div>

          {/* subtenants */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Subtenants{" "}
                {subtenants.length > 0 && (
                  <span className="font-normal text-gray-400">({subtenants.length})</span>
                )}
              </h3>
              <button
                onClick={addSub}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {subtenants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400">
                No subtenants yet. Click “Add” to create one.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[80px_1fr_28px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  <span>No.</span>
                  <span>Name</span>
                  <span />
                </div>
                {subtenants.map((s, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_28px] items-center gap-2">
                    <input
                      value={s.no}
                      onChange={(e) => setSub(i, { no: e.target.value })}
                      placeholder="#"
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
                    />
                    <input
                      value={s.name}
                      onChange={(e) => setSub(i, { name: e.target.value })}
                      placeholder="Subtenant name"
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
                    />
                    <button
                      onClick={() => removeSub(i)}
                      className="rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-200 transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />} Save details
          </button>
        </div>
      </aside>
    </div>
  );
}
