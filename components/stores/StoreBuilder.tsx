"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Search,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Pencil,
  FileText,
  Download,
  Check,
  PackagePlus,
  Settings2,
  Ruler,
} from "lucide-react";
import type { EquipmentDTO, StoreItemDTO, StoreView } from "@/lib/types";
import { DeptChip } from "@/components/DeptChip";
import { cn, DEPARTMENTS } from "@/lib/utils";
import { EquipmentEditDrawer } from "./EquipmentEditDrawer";
import { CustomItemEditDrawer } from "./CustomItemEditDrawer";
import {
  addItemToStore,
  addCustomItem,
  removeStoreItem,
  duplicateAsCustom,
  reorderStoreItems,
  updateStoreItem,
} from "@/app/actions/store";
import { StoreDetailsDrawer } from "./StoreDetailsDrawer";
import { PdfPreviewDrawer, type PreviewTarget } from "./PdfPreviewDrawer";

/** Mutable header fields the details drawer can edit in place. */
type StoreMeta = Pick<
  StoreView,
  "name" | "number" | "location" | "floorplanUrl" | "floorplanName" | "subtenants"
>;

export function StoreBuilder({
  store,
  equipment,
}: {
  store: StoreView;
  equipment: EquipmentDTO[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<StoreItemDTO[]>(store.items);
  const [editingEq, setEditingEq] = useState<EquipmentDTO | null>(null);
  const [editingCustom, setEditingCustom] = useState<StoreItemDTO | null>(null);
  const [meta, setMeta] = useState<StoreMeta>({
    name: store.name,
    number: store.number,
    location: store.location,
    floorplanUrl: store.floorplanUrl,
    floorplanName: store.floorplanName,
    subtenants: store.subtenants,
  });
  const [q, setQ] = useState("");
  const [activeDrag, setActiveDrag] = useState<EquipmentDTO | StoreItemDTO | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addedIds = useMemo(
    () => new Set(items.map((i) => i.equipmentId).filter(Boolean) as string[]),
    [items]
  );

  const filteredCatalog = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return equipment;
    return equipment.filter((e) =>
      `${e.description} ${e.manufacturer ?? ""} ${e.model ?? ""} ${e.masterItemNo}`
        .toLowerCase()
        .includes(needle)
    );
  }, [equipment, q]);

  function previewItem(it: { description: string; manufacturer: string | null; pdfUrl: string | null; pdfDownloaded: boolean }) {
    if (!it.pdfUrl) return;
    setPreview({
      title: it.description,
      subtitle: it.manufacturer,
      url: it.pdfUrl,
      downloaded: it.pdfDownloaded,
    });
  }

  async function addEquipment(eq: EquipmentDTO) {
    // optimistic temp row, reconciled with the real id from the server
    const temp: StoreItemDTO = {
      id: `temp-${eq.id}-${items.length}`,
      equipmentId: eq.id,
      description: eq.description,
      manufacturer: eq.manufacturer,
      model: eq.model,
      dimension: eq.dimension,
      quantity: 1,
      room: null,
      proposeNew: null,
      scheduleNo: null,
      position: items.length,
      departments: eq.departments,
      pdfUrl: eq.pdfUrl,
      pdfDownloaded: eq.pdfDownloaded,
    };
    setItems((cur) => [...cur, temp]);
    const realId = await addItemToStore(store.id, eq.id);
    setItems((cur) => cur.map((i) => (i.id === temp.id ? { ...i, id: realId } : i)));
  }

  async function addCustom() {
    const desc = prompt("Custom item description:");
    if (!desc) return;
    const id = await addCustomItem(store.id, desc);
    setItems((cur) => [
      ...cur,
      {
        id,
        equipmentId: null,
        description: desc,
        manufacturer: null,
        model: null,
        dimension: null,
        quantity: 1,
        room: null,
        proposeNew: null,
        scheduleNo: null,
        position: cur.length,
        departments: [],
        pdfUrl: null,
        pdfDownloaded: false,
      },
    ]);
  }

  // copy a row into a detached custom item placed right after it
  async function duplicate(item: StoreItemDTO) {
    if (item.id.startsWith("temp-")) return;
    const newId = await duplicateAsCustom(item.id);
    setItems((cur) => {
      const idx = cur.findIndex((i) => i.id === item.id);
      const copy: StoreItemDTO = {
        ...item,
        id: newId,
        equipmentId: null,
        departments: [],
        pdfUrl: null,
        pdfDownloaded: false,
      };
      const next = [...cur];
      next.splice(idx < 0 ? cur.length : idx + 1, 0, copy);
      return next.map((i, pos) => ({ ...i, position: pos }));
    });
  }

  async function remove(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    if (!id.startsWith("temp-")) await removeStoreItem(id);
  }

  function patch(id: string, p: Partial<StoreItemDTO>) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  // pencil: linked rows open the shared family editor, custom rows edit their own fields
  function editItem(item: StoreItemDTO) {
    if (!item.equipmentId) {
      if (!item.id.startsWith("temp-")) setEditingCustom(item);
      return;
    }
    const eq = equipment.find((e) => e.id === item.equipmentId);
    if (eq) setEditingEq(eq);
  }

  // after the shared Equipment is saved, reflect the change on every row that uses it
  function onEquipmentSaved(fd: FormData) {
    const eqId = editingEq?.id;
    if (!eqId) return;
    const val = (k: string) => {
      const v = (fd.get(k) as string | null)?.trim();
      return v ? v : null;
    };
    const description = val("description");
    const p: Partial<StoreItemDTO> = {
      manufacturer: val("manufacturer"),
      model: val("model"),
      dimension: val("dimension"),
      departments: DEPARTMENTS.filter((d) => fd.get(`dept:${d}`) === "on"),
      ...(description ? { description } : {}),
    };
    setItems((cur) => cur.map((i) => (i.equipmentId === eqId ? { ...i, ...p } : i)));
    router.refresh(); // refresh server data so the catalog pane + specs stay in sync
  }

  async function persistField(
    id: string,
    field: "quantity" | "room" | "proposeNew" | "scheduleNo",
    value: string
  ) {
    if (id.startsWith("temp-")) return;
    if (field === "quantity") await updateStoreItem(id, { quantity: parseFloat(value) || 1 });
    else await updateStoreItem(id, { [field]: value || null });
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("cat:")) {
      setActiveDrag(equipment.find((x) => x.id === id.slice(4)) ?? null);
    } else {
      setActiveDrag(items.find((x) => x.id === id) ?? null);
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    // dragged a catalog card into the store
    if (activeId.startsWith("cat:")) {
      const eq = equipment.find((x) => x.id === activeId.slice(4));
      if (eq) await addEquipment(eq);
      return;
    }

    // reordered store items
    if (activeId !== overId && !overId.startsWith("cat:")) {
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        const next = arrayMove(items, oldIndex, newIndex);
        setItems(next);
        await reorderStoreItems(
          store.id,
          next.filter((i) => !i.id.startsWith("temp-")).map((i) => i.id)
        );
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1500px] flex-col px-4 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <Link
              href="/stores"
              className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={15} /> Stores
            </Link>
            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">
              {meta.name}
              {meta.location && (
                <span className="ml-2 text-base font-normal text-gray-400">{meta.location}</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{items.length} items</span>
            <button
              onClick={() => setDetailsOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              <Settings2 size={15} /> Details
            </button>
            <a
              href={`/api/stores/${store.id}/export.xlsx`}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} /> Excel
            </a>
            <a
              href={`/api/stores/${store.id}/export.zip`}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText size={15} /> PDFs
            </a>
          </div>
        </div>

        {/* two panes */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 pb-4 lg:grid-cols-[360px_1fr]">
          {/* catalog */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-white/60 bg-white/55 shadow-sm backdrop-blur-md backdrop-saturate-150">
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search equipment…"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto p-2">
              {filteredCatalog.map((eq) => (
                <CatalogItem
                  key={eq.id}
                  eq={eq}
                  added={addedIds.has(eq.id)}
                  onAdd={() => addEquipment(eq)}
                />
              ))}
            </div>
          </div>

          {/* store */}
          <StoreDropZone
            items={items}
            onRemove={remove}
            onDuplicate={duplicate}
            onPatch={patch}
            onPersist={persistField}
            onAddCustom={addCustom}
            onPreview={previewItem}
            onEdit={editItem}
          />
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="w-[340px] rounded-xl border border-brand-300 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-lg">
            {activeDrag.description}
          </div>
        ) : null}
      </DragOverlay>

      {detailsOpen && (
        <StoreDetailsDrawer
          store={{ id: store.id, ...meta }}
          onClose={() => setDetailsOpen(false)}
          onSaved={(p) => setMeta((m) => ({ ...m, ...p }))}
          onPreview={setPreview}
        />
      )}
      <PdfPreviewDrawer target={preview} onClose={() => setPreview(null)} />

      {editingEq && (
        <EquipmentEditDrawer
          equipment={editingEq}
          onClose={() => setEditingEq(null)}
          onSaved={onEquipmentSaved}
        />
      )}
      {editingCustom && (
        <CustomItemEditDrawer
          item={editingCustom}
          onClose={() => setEditingCustom(null)}
          onSaved={(fields) => {
            patch(editingCustom.id, fields);
            setEditingCustom(null);
          }}
        />
      )}
    </DndContext>
  );
}

function CatalogItem({
  eq,
  added,
  onAdd,
}: {
  eq: EquipmentDTO;
  added: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `cat:${eq.id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-center gap-2 rounded-lg border border-white/50 bg-white/50 p-2 transition hover:border-brand-300 hover:bg-white/70",
        isDragging && "opacity-40"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        title="Drag into store"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{eq.description}</p>
        <p className="truncate text-xs text-gray-400">
          #{eq.masterItemNo}
          {eq.manufacturer ? ` · ${eq.manufacturer}` : ""}
          {eq.dimension ? ` · ${eq.dimension}` : ""}
        </p>
      </div>
      {eq.pdfUrl && <FileText size={13} className="shrink-0 text-brand-400" />}
      <button
        onClick={onAdd}
        className={cn(
          "shrink-0 rounded-md p-1 transition",
          added
            ? "text-green-500"
            : "text-gray-300 hover:bg-brand-50 hover:text-brand-600 group-hover:text-brand-500"
        )}
        title={added ? "Already added (click to add again)" : "Add to store"}
      >
        {added ? <Check size={16} /> : <Plus size={16} />}
      </button>
    </div>
  );
}

// shared column template for the schedule header + rows
const COLS =
  "grid-cols-[20px_26px_minmax(150px,1.5fr)_minmax(104px,0.9fr)_52px_minmax(150px,1.2fr)_176px]";

// equipment-schedule status options (mirror the audit Excel)
const STATUS_OPTIONS = ["New", "Existing", "(E)Relocate", "Remove"] as const;
const statusKey = (v: string) => v.toLowerCase().replace(/\s+/g, "");
/** map a stored value to its canonical option (case/space-insensitive), else pass through */
function canonicalStatus(v: string | null): string {
  if (!v) return "";
  const k = statusKey(v);
  return STATUS_OPTIONS.find((o) => statusKey(o) === k) ?? v;
}

function StoreDropZone({
  items,
  onRemove,
  onDuplicate,
  onPatch,
  onPersist,
  onAddCustom,
  onPreview,
  onEdit,
}: {
  items: StoreItemDTO[];
  onRemove: (id: string) => void;
  onDuplicate: (it: StoreItemDTO) => void;
  onPatch: (id: string, p: Partial<StoreItemDTO>) => void;
  onPersist: (
    id: string,
    field: "quantity" | "room" | "proposeNew" | "scheduleNo",
    value: string
  ) => void;
  onAddCustom: () => void;
  onPreview: (it: StoreItemDTO) => void;
  onEdit: (it: StoreItemDTO) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "store-drop" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border-2 shadow-sm backdrop-blur-md backdrop-saturate-150 transition",
        isOver ? "border-brand-400 bg-brand-50/40" : "border-white/60 bg-white/55"
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-gray-700">Store equipment schedule</h2>
        <button
          onClick={onAddCustom}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600"
        >
          <PackagePlus size={14} /> Custom item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="m-3 flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
          Drag equipment here, or click + on a catalog item
        </div>
      ) : (
        <div className="scroll-thin flex-1 overflow-y-auto p-2">
          {/* header row */}
          <div
            className={cn(
              "sticky top-0 z-10 mb-1 grid items-center gap-2 bg-white/70 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur",
              COLS
            )}
          >
            <span />
            <span>#</span>
            <span>Equipment</span>
            <span>Dimension</span>
            <span>Qty</span>
            <span>Room</span>
            <span>Status</span>
          </div>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((it, idx) => (
              <SortableStoreRow
                key={it.id}
                item={it}
                index={idx + 1}
                onRemove={() => onRemove(it.id)}
                onDuplicate={() => onDuplicate(it)}
                onPatch={(p) => onPatch(it.id, p)}
                onPersist={(field, value) => onPersist(it.id, field, value)}
                onPreview={() => onPreview(it)}
                onEdit={() => onEdit(it)}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

function SortableStoreRow({
  item,
  index,
  onRemove,
  onDuplicate,
  onPatch,
  onPersist,
  onPreview,
  onEdit,
}: {
  item: StoreItemDTO;
  index: number;
  onRemove: () => void;
  onDuplicate: () => void;
  onPatch: (p: Partial<StoreItemDTO>) => void;
  onPersist: (field: "quantity" | "room" | "proposeNew" | "scheduleNo", value: string) => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group mb-1 grid items-start gap-2 rounded-lg border border-white/50 bg-white/45 px-2 py-2 hover:border-brand-200 hover:bg-white/65",
        COLS,
        isDragging && "z-20 opacity-80 shadow-md"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>
      <span className="mt-1 font-mono text-xs text-gray-400">{index}</span>

      {/* equipment: description, manufacturer, ALL department tags, pdf preview */}
      <div className="min-w-0">
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-800">
            {item.description}
          </p>
          {item.pdfUrl && (
            <button
              onClick={onPreview}
              className="mt-0.5 shrink-0 rounded p-0.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600"
              title="Preview spec PDF"
            >
              <FileText size={14} />
            </button>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {item.manufacturer && (
            <span className="truncate text-xs text-gray-400">{item.manufacturer}</span>
          )}
          {item.departments.map((d) => (
            <DeptChip key={d} dept={d} />
          ))}
          {!item.equipmentId && (
            <span className="rounded bg-gray-100 px-1 text-[10px] text-gray-500">custom</span>
          )}
        </div>
      </div>

      {/* dimension (from catalog, read-only here) */}
      <div className="mt-1 min-w-0">
        {item.dimension ? (
          <span className="flex items-start gap-1 text-xs text-gray-600">
            <Ruler size={12} className="mt-0.5 shrink-0 text-gray-300" />
            <span className="break-words">{item.dimension}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>

      <input
        type="number"
        min={0}
        step="1"
        defaultValue={item.quantity}
        onChange={(e) => onPatch({ quantity: parseFloat(e.target.value) || 0 })}
        onBlur={(e) => onPersist("quantity", e.target.value)}
        className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-center text-sm outline-none focus:border-brand-400"
      />
      <input
        defaultValue={item.room ?? ""}
        placeholder="Room / area…"
        onBlur={(e) => onPersist("room", e.target.value)}
        className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none focus:border-brand-400"
      />
      <div className="flex items-center gap-1">
        {(() => {
          const status = canonicalStatus(item.proposeNew);
          const extra = status && !STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number]);
          return (
            <select
              value={status}
              onChange={(e) => {
                onPatch({ proposeNew: e.target.value || null });
                onPersist("proposeNew", e.target.value);
              }}
              className="w-full rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm outline-none focus:border-brand-400"
            >
              <option value="">—</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              {extra && <option value={status}>{status}</option>}
            </select>
          );
        })()}
        <button
          onClick={onDuplicate}
          className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100"
          title="Duplicate as custom item"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={onEdit}
          className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100"
          title={item.equipmentId ? "Edit equipment" : "Edit custom item"}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
