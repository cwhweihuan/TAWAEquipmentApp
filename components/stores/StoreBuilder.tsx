"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  FileText,
  Download,
  Check,
  PackagePlus,
} from "lucide-react";
import type { EquipmentDTO, StoreItemDTO } from "@/lib/types";
import { DeptChip } from "@/components/DeptChip";
import { cn } from "@/lib/utils";
import {
  addItemToStore,
  addCustomItem,
  removeStoreItem,
  reorderStoreItems,
  updateStoreItem,
} from "@/app/actions/store";

type StoreView = {
  id: string;
  number: string;
  name: string;
  location: string | null;
  items: StoreItemDTO[];
};

export function StoreBuilder({
  store,
  equipment,
}: {
  store: StoreView;
  equipment: EquipmentDTO[];
}) {
  const [items, setItems] = useState<StoreItemDTO[]>(store.items);
  const [q, setQ] = useState("");
  const [activeDrag, setActiveDrag] = useState<EquipmentDTO | StoreItemDTO | null>(null);
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

  async function addEquipment(eq: EquipmentDTO) {
    // optimistic temp row, reconciled with the real id from the server
    const temp: StoreItemDTO = {
      id: `temp-${eq.id}-${items.length}`,
      equipmentId: eq.id,
      description: eq.description,
      manufacturer: eq.manufacturer,
      model: eq.model,
      quantity: 1,
      room: null,
      proposeNew: null,
      scheduleNo: null,
      position: items.length,
      departments: eq.departments,
      pdfUrl: eq.pdfUrl,
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
        quantity: 1,
        room: null,
        proposeNew: null,
        scheduleNo: null,
        position: cur.length,
        departments: [],
        pdfUrl: null,
      },
    ]);
  }

  async function remove(id: string) {
    setItems((cur) => cur.filter((i) => i.id !== id));
    if (!id.startsWith("temp-")) await removeStoreItem(id);
  }

  function patch(id: string, p: Partial<StoreItemDTO>) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
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
          <div>
            <Link
              href="/stores"
              className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={15} /> Stores
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              #{store.number} <span className="text-gray-400">{store.location}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{items.length} items</span>
            <a
              href={`/api/stores/${store.id}/export.xlsx`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} /> Excel
            </a>
            <a
              href={`/api/stores/${store.id}/export.zip`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText size={15} /> PDFs
            </a>
          </div>
        </div>

        {/* two panes */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 pb-4 lg:grid-cols-[360px_1fr]">
          {/* catalog */}
          <div className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
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
            onPatch={patch}
            onPersist={persistField}
            onAddCustom={addCustom}
          />
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="w-[340px] rounded-lg border border-brand-300 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-lg">
            {activeDrag.description}
          </div>
        ) : null}
      </DragOverlay>
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
        "group flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 transition hover:border-brand-300",
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

function StoreDropZone({
  items,
  onRemove,
  onPatch,
  onPersist,
  onAddCustom,
}: {
  items: StoreItemDTO[];
  onRemove: (id: string) => void;
  onPatch: (id: string, p: Partial<StoreItemDTO>) => void;
  onPersist: (
    id: string,
    field: "quantity" | "room" | "proposeNew" | "scheduleNo",
    value: string
  ) => void;
  onAddCustom: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "store-drop" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-col rounded-xl border-2 bg-white shadow-sm transition",
        isOver ? "border-brand-400 bg-brand-50/30" : "border-gray-200"
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
          <div className="sticky top-0 z-10 mb-1 grid grid-cols-[24px_28px_1fr_64px_88px_80px] items-center gap-2 bg-white px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            <span />
            <span>#</span>
            <span>Equipment</span>
            <span>Qty</span>
            <span>Room</span>
            <span>New?</span>
          </div>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((it, idx) => (
              <SortableStoreRow
                key={it.id}
                item={it}
                index={idx + 1}
                onRemove={() => onRemove(it.id)}
                onPatch={(p) => onPatch(it.id, p)}
                onPersist={(field, value) => onPersist(it.id, field, value)}
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
  onPatch,
  onPersist,
}: {
  item: StoreItemDTO;
  index: number;
  onRemove: () => void;
  onPatch: (p: Partial<StoreItemDTO>) => void;
  onPersist: (field: "quantity" | "room" | "proposeNew" | "scheduleNo", value: string) => void;
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
        "group mb-1 grid grid-cols-[24px_28px_1fr_64px_88px_80px] items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5 hover:border-gray-200",
        isDragging && "z-20 opacity-80 shadow-md"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>
      <span className="font-mono text-xs text-gray-400">{index}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{item.description}</p>
        <div className="flex items-center gap-1.5">
          {item.manufacturer && (
            <span className="truncate text-xs text-gray-400">{item.manufacturer}</span>
          )}
          {item.departments.slice(0, 1).map((d) => (
            <DeptChip key={d} dept={d} />
          ))}
          {!item.equipmentId && (
            <span className="rounded bg-gray-100 px-1 text-[10px] text-gray-500">custom</span>
          )}
        </div>
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
        placeholder="—"
        onBlur={(e) => onPersist("room", e.target.value)}
        className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-sm outline-none focus:border-brand-400"
      />
      <div className="flex items-center gap-1">
        <input
          defaultValue={item.proposeNew ?? ""}
          placeholder="—"
          onBlur={(e) => onPersist("proposeNew", e.target.value)}
          className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-sm outline-none focus:border-brand-400"
        />
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
