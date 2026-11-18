"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, X, Plus, LayoutGrid, List, GripVertical } from "lucide-react";
import Link from "next/link";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EquipmentDTO } from "@/lib/types";
import { DEPARTMENTS, deptStyle, deptHex, cn } from "@/lib/utils";
import { deleteEquipment, reorderCatalogEquipment } from "@/app/actions/equipment";
import { matchesEquipmentSearch } from "@/lib/equipment-search";
import { FloatingSearch } from "@/components/FloatingSearch";
import { EquipmentCard } from "./EquipmentCard";
import { EquipmentList } from "./EquipmentList";
import { DetailDrawer } from "./DetailDrawer";

export function CatalogBrowser({
  equipment,
  deptCounts,
}: {
  equipment: EquipmentDTO[];
  deptCounts: Record<string, number>;
}) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [activeDepts, setActiveDepts] = useState<string[]>([]);
  const [pdfOnly, setPdfOnly] = useState(false);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const [, startDelete] = useTransition();

  const [orderError, setOrderError] = useState<string | null>(null);
  const [savingOrder, startOrder] = useTransition();
  const [orderedEquipment, applyOrder] = useOptimistic(equipment, (items, order: ReadonlyMap<string, number>) =>
    items.map((item) => ({ ...item, masterItemNo: order.get(item.id) ?? item.masterItemNo }))
      .sort((a, b) => a.masterItemNo - b.masterItemNo),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDelete(item: EquipmentDTO) {
    if (!confirm(`Delete "${item.description}"? This cannot be undone.`)) return;
    setSelectedId(null);
    startDelete(async () => {
      await deleteEquipment(item.id);
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orderedEquipment.filter((e) => {
      if (pdfOnly && !e.pdfUrl) return false;
      if (activeDepts.length && !activeDepts.some((d) => e.departments.includes(d))) return false;
      if (!matchesEquipmentSearch(e, needle)) return false;
      return true;
    });
  }, [orderedEquipment, q, activeDepts, pdfOnly]);

  function handleReorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || savingOrder) return;
    const from = filtered.findIndex((item) => item.id === active.id);
    const to = filtered.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;

    const first = Math.min(from, to);
    const range = filtered.slice(first, Math.max(from, to) + 1);
    const expected = range.map(({ id, masterItemNo }) => ({ id, masterItemNo }));
    const reordered = arrayMove(range, from - first, to - first);
    setOrderError(null);
    startOrder(async () => {
      applyOrder(new Map(reordered.map(({ id }, index) => [id, expected[index].masterItemNo])));
      try {
        if (!(await reorderCatalogEquipment(expected, range[from - first].id, range[to - first].id))) {
          setOrderError("The catalog order changed. Try again after it refreshes.");
          router.refresh();
        }
      } catch {
        setOrderError("Could not save the catalog order. Try again.");
      }
    });
  }

  const selectedIndex = filtered.findIndex((item) => item.id === selectedId);
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;

  const toggleDept = (d: string) => {
    setSelectedId(null);
    setActiveDepts((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-6 pb-28 sm:px-6">
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
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-200 transition hover:bg-brand-700"
          >
            <Plus size={16} /> New equipment
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSelectedId(null);
              }}
              placeholder="Search equipment, PDF name, manufacturer, model…"
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
            onClick={() => {
              setPdfOnly((v) => !v);
              setSelectedId(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
              pdfOnly
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <FileText size={15} /> Has spec
          </button>
          <div role="group" aria-label="Equipment display" className="flex rounded-lg border border-gray-200 bg-white p-1">
            {(["cards", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-brand-400",
                  view === mode ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {mode === "cards" ? <LayoutGrid size={15} /> : <List size={15} />}
                {mode === "cards" ? "Cards" : "List"}
              </button>
            ))}
          </div>
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
                setSelectedId(null);
              }}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-20" />
      <FloatingSearch
        value={q}
        onChange={(value) => {
          setQ(value);
          setSelectedId(null);
        }}
        resultCount={filtered.length}
        onShowResults={() => resultsRef.current?.scrollIntoView({ block: "start" })}
      />

      {orderError && <p role="alert" className="mb-3 text-sm text-red-600">{orderError}</p>}

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center text-sm text-gray-400">
          No equipment matches your filters.
        </div>
      ) : view === "list" ? (
        <EquipmentList items={filtered} onSelect={setSelectedId} />
      ) : (
        <DndContext id="catalog-card-sort" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
          <SortableContext items={filtered.map((item) => item.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <SortableEquipmentCard key={item.id} item={item} disabled={savingOrder} onClick={() => setSelectedId(item.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <DetailDrawer
        key={selected?.id ?? "closed"}
        item={selected}
        onClose={() => setSelectedId(null)}
        onDelete={handleDelete}
        position={selectedIndex + 1}
        total={filtered.length}
        onPrevious={() => {
          if (selectedIndex > 0) setSelectedId(filtered[selectedIndex - 1].id);
        }}
        onNext={() => {
          if (selectedIndex >= 0 && selectedIndex < filtered.length - 1) {
            setSelectedId(filtered[selectedIndex + 1].id);
          }
        }}
      />
    </div>
  );
}


function SortableEquipmentCard({ item, disabled, onClick }: {
  item: EquipmentDTO;
  disabled: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex min-w-0 flex-col", isDragging && "z-20")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Reorder equipment #${item.masterItemNo}`}
        title="Drag to reorder"
        className="flex h-6 w-full cursor-grab touch-none items-center justify-center rounded-t-lg bg-white/40 text-gray-400 hover:bg-brand-50 hover:text-brand-600 active:cursor-grabbing disabled:opacity-50"
      >
        <GripVertical size={14} />
      </button>
      <EquipmentCard item={item} onClick={onClick} />
    </div>
  );
}
