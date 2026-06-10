"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, X, Plus } from "lucide-react";
import Link from "next/link";
import type { EquipmentDTO } from "@/lib/types";
import { DEPARTMENTS, deptStyle, deptHex, cn } from "@/lib/utils";
import { deleteEquipment } from "@/app/actions/equipment";
import { EquipmentCard } from "./EquipmentCard";
import { DetailDrawer } from "./DetailDrawer";

export function CatalogBrowser({
  equipment,
  deptCounts,
}: {
  equipment: EquipmentDTO[];
  deptCounts: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const [activeDepts, setActiveDepts] = useState<string[]>([]);
  const [pdfOnly, setPdfOnly] = useState(false);
  const [selected, setSelected] = useState<EquipmentDTO | null>(null);
  const router = useRouter();
  const [, startDelete] = useTransition();

  function handleDelete(item: EquipmentDTO) {
    if (!confirm(`Delete "${item.description}"? This cannot be undone.`)) return;
    setSelected(null);
    startDelete(async () => {
      await deleteEquipment(item.id);
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return equipment.filter((e) => {
      if (pdfOnly && !e.pdfUrl) return false;
      if (activeDepts.length && !activeDepts.some((d) => e.departments.includes(d))) return false;
      if (needle) {
        const hay = `${e.description} ${e.manufacturer ?? ""} ${e.model ?? ""} ${e.masterItemNo}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [equipment, q, activeDepts, pdfOnly]);

  const toggleDept = (d: string) =>
    setActiveDepts((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      {/* toolbar */}
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Equipment catalog</h1>
            <p className="text-sm text-gray-500">
              {filtered.length} of {equipment.length} items
            </p>
          </div>
          <Link
            href="/catalog/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={16} /> New equipment
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search description, manufacturer, model…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            onClick={() => setPdfOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
              pdfOnly
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <FileText size={15} /> Has spec
          </button>
        </div>

        {/* department filter */}
        <div className="flex flex-wrap gap-1.5">
          {DEPARTMENTS.map((d) => {
            const active = activeDepts.includes(d);
            const s = deptStyle(d);
            return (
              <button
                key={d}
                onClick={() => toggleDept(d)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  active
                    ? "border-transparent text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
                style={active ? { backgroundColor: deptHex(d) } : undefined}
              >
                {!active && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
                {d}
                <span className={cn("text-[10px]", active ? "text-white/80" : "text-gray-400")}>
                  {deptCounts[d] ?? 0}
                </span>
              </button>
            );
          })}
          {(activeDepts.length > 0 || pdfOnly || q) && (
            <button
              onClick={() => {
                setActiveDepts([]);
                setPdfOnly(false);
                setQ("");
              }}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center text-sm text-gray-400">
          No equipment matches your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((item) => (
            <EquipmentCard key={item.id} item={item} onClick={() => setSelected(item)} />
          ))}
        </div>
      )}

      <DetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onEdit={(it) => router.push(`/catalog/${it.id}/edit`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
