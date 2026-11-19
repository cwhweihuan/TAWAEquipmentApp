"use client";

import { useEffect, useId, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Pencil,
  FileText,
  Link2,
  Download,
  Check,
  PackagePlus,
  Settings2,
  Ruler,
} from "lucide-react";
import type { EquipmentDTO, StoreEquipmentGrouping, StoreItemDTO, StoreView } from "@/lib/types";
import { matchesEquipmentSearch } from "@/lib/equipment-search";
import { PdfCaption } from "@/components/catalog/PdfCaption";
import { DeptChip } from "@/components/DeptChip";
import { cn, DEPARTMENTS, sentenceCase, splitStoreSpecSource, STORE_STATUS_OPTIONS } from "@/lib/utils";
import { DetailDrawer } from "@/components/catalog/DetailDrawer";
import { CustomItemPreviewDrawer } from "./CustomItemPreviewDrawer";
import { EquipmentEditDrawer } from "./EquipmentEditDrawer";
import { CustomItemEditDrawer } from "./CustomItemEditDrawer";
import {
  addItemToStore,
  addCustomItem,
  addOmittedItem,
  removeStoreItem,
  duplicateAsCustom,
  reorderStoreItems,
  replaceStoreItemEquipment,
  saveStoreItemRemarks,
  saveStoreEquipmentGrouping,
  updateStoreItem,
  updateStoreItemPlacements,
  type StoreItemPlacementPatch,
} from "@/app/actions/store";
import { StoreDetailsDrawer } from "./StoreDetailsDrawer";
import { StoreRoomsDrawer } from "./StoreRoomsDrawer";
import { PdfPreviewDrawer, type PreviewTarget } from "./PdfPreviewDrawer";

/** Mutable header fields the details drawer can edit in place. */
type StoreMeta = Pick<
  StoreView,
  "name" | "number" | "location" | "floorplanUrl" | "floorplanPath" | "floorplanName" | "subtenants"
>;

export function StoreBuilder({
  store,
  equipment,
}: {
  store: StoreView;
  equipment: EquipmentDTO[];
}) {
  const router = useRouter();
  const dragContextId = useId();
  const [items, setItems] = useState<StoreItemDTO[]>(store.items);
  const [previewTarget, setPreviewTarget] = useState<{ source: "catalog" | "store"; id: string } | null>(null);
  const [rooms, setRooms] = useState(store.rooms);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [editingEq, setEditingEq] = useState<{ equipment: EquipmentDTO; rowId?: string } | null>(null);
  const [replacing, setReplacing] = useState<StoreItemDTO | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const pendingRemarks = useRef(new Map<string, Promise<string | undefined>>());
  const [meta, setMeta] = useState<StoreMeta>({
    name: store.name,
    number: store.number,
    location: store.location,
    floorplanUrl: store.floorplanUrl,
    floorplanPath: store.floorplanPath,
    floorplanName: store.floorplanName,
    subtenants: store.subtenants,
  });
  const [q, setQ] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [sortByNumber, setSortByNumber] = useState(false);
  const [activeDrag, setActiveDrag] = useState<EquipmentDTO | StoreItemDTO | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const catalogSpecUrls = useMemo(() => new Map(equipment.map((item) => [item.id, item.specUrl])), [equipment]);

  const addedIds = useMemo(
    () => new Set(items.map((i) => i.equipmentId).filter(Boolean) as string[]),
    [items]
  );

  const filteredCatalog = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return equipment;
    return equipment.filter((e) => matchesEquipmentSearch(e, needle));
  }, [equipment, q]);

  const displayedItems = useMemo(() => {
    if (!sortByNumber) return items;
    return [...items].sort((a, b) => {
      const first = a.scheduleNo?.trim() || "";
      const second = b.scheduleNo?.trim() || "";
      return Number(!first) - Number(!second) || floorPlanCollator.compare(first, second);
    });
  }, [items, sortByNumber]);

  const previewList = previewTarget?.source === "catalog" ? filteredCatalog : displayedItems;
  const previewIndex = previewList.findIndex((item) => item.id === previewTarget?.id);
  const previewRow = previewTarget?.source === "store" ? items.find((item) => item.id === previewTarget.id) ?? null : null;
  const previewEquipment = equipment.find((eq) => eq.id === (previewTarget?.source === "catalog" ? previewTarget.id : previewRow?.equipmentId)) ?? null;
  const editingStoreRow = items.find((item) => item.id === editingEq?.rowId);
  const editingCustom = items.find((item) => item.id === editingCustomId);
  const previewCustom = previewRow && !previewRow.equipmentId ? previewRow : null;
  function movePreview(offset: number) {
    const next = previewList[previewIndex + offset];
    if (previewTarget && next) setPreviewTarget({ ...previewTarget, id: next.id });
  }

  function previewEquipmentItem(item: StoreItemDTO) {
    setPreviewTarget({ source: "store", id: item.id });
  }

  function previewItem(it: { description: string; manufacturer: string | null; pdfUrl: string | null; pdfDownloaded: boolean }) {
    if (!it.pdfUrl) return;
    setPreview({
      title: it.description.toUpperCase(),
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
      remarks: eq.remarks,
      quantity: 1,
      rooms: [],
      proposeNew: null,
      scheduleNo: null,
      drawingPage: null,
      customGroup: null,
      position: items.length,
      departments: eq.departments,
      pdfFilename: eq.pdfFilename,
      pdfUrl: eq.pdfUrl,
      pdfDownloaded: eq.pdfDownloaded,
    };
    setItemError(null);
    setItems((cur) => [...cur, temp]);
    try {
      const realId = await addItemToStore(store.id, eq.id);
      setItems((cur) => cur.map((i) => (i.id === temp.id ? { ...i, id: realId } : i)));
    } catch (error) {
      setItems((cur) => cur.filter((i) => i.id !== temp.id));
      setItemError(error instanceof Error ? error.message : "Could not add equipment.");
    }
  }

  async function addCustom(omitted = false) {
    const desc = omitted ? "Omitted" : prompt("Custom item description:");
    if (!desc) return;
    const id = omitted ? await addOmittedItem(store.id) : await addCustomItem(store.id, desc);
    setItems((cur) => [
      ...cur,
      {
        id,
        equipmentId: null,
        description: desc,
        manufacturer: null,
        model: null,
        dimension: null,
        remarks: null,
        quantity: omitted ? 0 : 1,
        rooms: [],
        proposeNew: null,
        scheduleNo: null,
        drawingPage: null,
        customGroup: null,
        position: cur.length,
        departments: [],
        pdfFilename: null,
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
        pdfFilename: null,
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
  async function editItem(item: StoreItemDTO) {
    const pending = pendingRemarks.current.get(item.id);
    if (pending) {
      try {
        if (await pending) return;
      } catch {
        return;
      }
    }
    if (!item.equipmentId) {
      if (!item.id.startsWith("temp-")) setEditingCustomId(item.id);
      return;
    }
    const eq = equipment.find((e) => e.id === item.equipmentId);
    if (eq) setEditingEq({ equipment: eq, rowId: item.id });
  }

  function persistRemarks(item: StoreItemDTO, value: string) {
    const save = async () => {
      const result = await saveStoreItemRemarks(store.id, item.id, item.equipmentId, value);
      if (result.error !== undefined) return result.error;
      patch(item.id, { remarks: result.remarks, hasStoreRemarks: true });
    };
    const pending = save().finally(() => pendingRemarks.current.delete(item.id));
    pendingRemarks.current.set(item.id, pending);
    return pending;
  }

  // after the shared Equipment is saved, reflect the change on every row that uses it
  function onEquipmentSaved(fd: FormData) {
    const eqId = editingEq?.equipment.id;
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
      remarks: val("remarks"),
      departments: DEPARTMENTS.filter((d) => fd.get(`dept:${d}`) === "on"),
      ...(description ? { description } : {}),
    };
    const nextRemarks = val("remarks") ?? "";
    setItems((cur) => cur.map((i) => {
      if (i.equipmentId !== eqId) return i;
      if (editingStoreRow) {
        const notesChanged = i.id === editingStoreRow.id && nextRemarks !== (editingStoreRow.remarks ?? "").trim();
        return { ...i, ...p, remarks: notesChanged ? nextRemarks : i.remarks, hasStoreRemarks: notesChanged || i.hasStoreRemarks };
      }
      return { ...i, ...p, remarks: i.hasStoreRemarks ? i.remarks : p.remarks ?? null };
    }));
    setEditingEq(null);
    router.refresh(); // refresh server data so the catalog pane + specs stay in sync
  }

  async function persistField(
    id: string,
    field: "quantity" | "rooms" | "proposeNew" | "scheduleNo",
    value: string | string[]
  ) {
    if (id.startsWith("temp-")) return;
    setItemError(null);
    try {
      const text = typeof value === "string" ? value : "";
      const quantity = text.trim() === "" ? 1 : Number(text);
      if (field === "quantity") await updateStoreItem(id, { quantity });
      else if (field === "rooms") await updateStoreItem(id, { rooms: value as string[] });
      else await updateStoreItem(id, { [field]: text || null });
      patch(id, { [field]: field === "quantity" ? quantity : field === "rooms" ? value : text || null });
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "Could not save item.");
      throw error;
    }
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
    if (!sortByNumber && activeId !== overId && !overId.startsWith("cat:")) {
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
      id={dragContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="mx-auto flex h-[calc(100dvh-3.5rem-1px)] min-h-0 max-w-[1500px] flex-col overflow-hidden px-4 sm:px-6">
        {/* header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <Link
              href="/stores"
              className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft size={15} /> Stores
            </Link>
            <button
              type="button"
              aria-controls="store-equipment-catalog"
              aria-expanded={catalogOpen}
              aria-label={catalogOpen ? "Hide equipment search" : "Show equipment search"}
              title={catalogOpen ? "Hide equipment search" : "Show equipment search"}
              onClick={() => setCatalogOpen((open) => !open)}
              className="ml-2 inline-flex rounded p-1 align-middle text-gray-500 hover:bg-brand-50 hover:text-brand-700"
            >
              {catalogOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">
              {meta.name}
              {/* name is usually "#<number> <location>" — only append location when it isn't already in the name */}
              {meta.location && !meta.name.toLowerCase().includes(meta.location.trim().toLowerCase()) && (
                <span className="ml-2 text-base font-normal text-gray-400">{meta.location}</span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">{items.length} items</span>
            <button type="button" onClick={() => setRoomsOpen(true)} className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"><Settings2 size={15} /> Rooms</button>
            <button type="button" onClick={() => {
              if (meta.floorplanUrl) setPreview({ title: "Floor plan", subtitle: meta.floorplanName, url: meta.floorplanUrl, downloaded: true });
              else setDetailsOpen(true);
            }} className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"><FileText size={15} /> Floor Plan</button>
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

        {itemError && <p role="alert" className="pb-2 text-sm text-red-600">{itemError}</p>}

        {/* two panes */}
        <div className={cn(
          "grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-hidden pb-4 lg:grid-rows-1",
          catalogOpen ? "grid-rows-2 lg:grid-cols-[360px_minmax(0,1fr)]" : "grid-rows-1"
        )}>
          {/* catalog */}
          <div id="store-equipment-catalog" className={cn(
            "min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-sm backdrop-blur-md backdrop-saturate-150",
            catalogOpen ? "flex" : "hidden"
          )}>
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search equipment or PDF name…"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div className="scroll-thin min-h-0 min-w-0 flex-1 space-y-1.5 overflow-y-auto p-2">
              {filteredCatalog.map((eq) => (
                <CatalogItem
                  key={eq.id}
                  eq={eq}
                  added={addedIds.has(eq.id)}
                  onAdd={() => addEquipment(eq)}
                  onPreview={() => setPreviewTarget({ source: "catalog", id: eq.id })}
                />
              ))}
            </div>
          </div>

          {/* store */}
          <StoreDropZone
            items={displayedItems}
            catalogSpecUrls={catalogSpecUrls}
            initialGrouping={store.equipmentGrouping}
            onGroupingChange={(mode) => saveStoreEquipmentGrouping(store.id, mode)}
            sortByNumber={sortByNumber}
            onSortChange={setSortByNumber}
            onBulkUpdate={async (ids, changes) => {
              const result = await updateStoreItemPlacements(store.id, ids, changes);
              if (result.error) throw new Error(result.error);
              const selected = new Set(ids);
              setItems((current) => current.map((item) => selected.has(item.id) ? { ...item, ...changes } : item));
            }}
            rooms={rooms}
            onRemove={remove}
            onDuplicate={duplicate}
            onPatch={patch}
            onPersist={persistField}
            onAddCustom={() => addCustom()}
            onAddOmitted={() => addCustom(true)}
            onPreview={previewItem}
            onOpenEquipment={previewEquipmentItem}
            onEdit={editItem}
            onReplace={setReplacing}
            onSaveRemarks={persistRemarks}
          />
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="w-[340px] rounded-xl border border-brand-300 bg-white p-2.5 text-sm font-medium text-gray-800 shadow-lg">
            {activeDrag.description.toUpperCase()}
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
      {roomsOpen && <StoreRoomsDrawer storeId={store.id} rooms={rooms} onClose={() => setRoomsOpen(false)} onSaved={(next, renames) => {
        setRooms(next);
        setItems((current) => current.map((item) => ({ ...item, rooms: item.rooms.map((room) => renames.get(room) ?? room) })));
        router.refresh();
      }} />}
      {previewEquipment && (
        <DetailDrawer
          key={previewEquipment.id}
          item={previewRow ? { ...previewEquipment, remarks: previewRow.remarks } : previewEquipment}
          readOnly
          position={previewIndex + 1}
          total={previewList.length}
          onPrevious={() => movePreview(-1)}
          onNext={() => movePreview(1)}
          onEdit={() => {
            setPreviewTarget(null);
            if (previewRow) void editItem(previewRow);
            else setEditingEq({ equipment: previewEquipment });
          }}
          onClose={() => setPreviewTarget(null)}
        >
          {previewRow && <StorePlacement key={previewRow.id} item={previewRow} rooms={rooms} onPersist={(field, value) => persistField(previewRow.id, field, value)} />}
        </DetailDrawer>
      )}
      {previewCustom && (
        <CustomItemPreviewDrawer item={previewCustom} onClose={() => setPreviewTarget(null)} position={previewIndex + 1} total={previewList.length} onPrevious={() => movePreview(-1)} onNext={() => movePreview(1)} onEdit={() => { setPreviewTarget(null); editItem(previewCustom); }}>
          <StorePlacement key={previewCustom.id} item={previewCustom} rooms={rooms} onPersist={(field, value) => persistField(previewCustom.id, field, value)} />
        </CustomItemPreviewDrawer>
      )}
      <PdfPreviewDrawer target={preview} onClose={() => setPreview(null)} />

      {editingEq && (!editingEq.rowId || editingStoreRow) && (
        <EquipmentEditDrawer
          equipment={editingEq.equipment}
          storeRow={editingStoreRow && { id: editingStoreRow.id, storeId: store.id, remarks: editingStoreRow.remarks }}
          onClose={() => setEditingEq(null)}
          onSaved={onEquipmentSaved}
        />
      )}
      {editingCustom && (
        <CustomItemEditDrawer
          item={editingCustom}
          onClose={() => setEditingCustomId(null)}
          onSaved={(fields) => {
            patch(editingCustom.id, fields);
            setEditingCustomId(null);
          }}
        />
      )}
      {replacing && (
        <ReplaceEquipmentDialog
          item={replacing}
          equipment={equipment}
          onClose={() => setReplacing(null)}
          onApply={async (eq) => {
            const result = await replaceStoreItemEquipment(store.id, replacing.id, replacing.equipmentId, eq.id);
            if (result.error) return result.error;
            patch(replacing.id, {
              equipmentId: eq.id,
              description: eq.description,
              manufacturer: eq.manufacturer,
              model: eq.model,
              dimension: eq.dimension,
              remarks: eq.remarks,
              hasStoreRemarks: false,
              departments: eq.departments,
              pdfFilename: eq.pdfFilename,
              pdfUrl: eq.pdfUrl,
              pdfDownloaded: eq.pdfDownloaded,
            });
            setReplacing(null);
          }}
        />
      )}
    </DndContext>
  );
}

function ReplaceEquipmentDialog({ item, equipment, onClose, onApply }: {
  item: StoreItemDTO;
  equipment: EquipmentDTO[];
  onClose: () => void;
  onApply: (equipment: EquipmentDTO) => Promise<string | undefined>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startApply] = useTransition();
  const needle = query.trim().toLowerCase();
  const matches = equipment.filter((eq) => eq.id !== item.equipmentId && (!needle || matchesEquipmentSearch(eq, needle)));
  const selected = matches.find((eq) => eq.id === selectedId);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function apply() {
    if (!selected || pending) return;
    setError(undefined);
    startApply(async () => {
      try {
        setError(await onApply(selected));
      } catch {
        setError("Could not replace this equipment. Try again.");
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="replace-equipment-title"
      onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-brand-200 bg-white text-gray-900 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[80dvh] flex-col gap-3 p-5">
        <div>
          <h2 id="replace-equipment-title" className="text-lg font-semibold">Replace by</h2>
          <p className="text-sm text-gray-600">{item.scheduleNo && `#${item.scheduleNo} · `}{item.description.toUpperCase()}</p>
        </div>
        <input
          type="search"
          aria-label="Search equipment"
          placeholder="Search equipment…"
          autoFocus
          value={query}
          disabled={pending}
          onChange={(event) => { setQuery(event.target.value); setSelectedId(""); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <fieldset disabled={pending} className="scroll-thin min-h-0 overflow-auto rounded-lg border border-gray-200">
          <legend className="sr-only">Replacement equipment</legend>
          {matches.map((eq) => (
            <label key={eq.id} className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-0 hover:bg-brand-50">
              <input type="radio" name="replacement-equipment" checked={selectedId === eq.id} onChange={() => setSelectedId(eq.id)} />
              <span>
                <span className="block font-medium">{eq.description.toUpperCase()}</span>
                <span className="block text-xs text-gray-500">{[`#${eq.masterItemNo}`, eq.manufacturer, eq.model, eq.dimension].filter(Boolean).join(" · ")}</span>
              </span>
            </label>
          ))}
          {!matches.length && <p className="px-3 py-2 text-sm text-gray-500">No equipment found.</p>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
          <button type="button" onClick={apply} disabled={!selected || pending} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function StorePlacement({ item, rooms, onPersist }: { item: StoreItemDTO; rooms: string[]; onPersist: (field: "rooms" | "scheduleNo", value: string | string[]) => Promise<void> }) {
  return <div className="mb-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
    <FloorPlanNumber value={item.scheduleNo} onSave={(value) => onPersist("scheduleNo", value)} />
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] text-gray-500">Room</span>
      <StoreRoomSelect compact floating selected={item.rooms} rooms={rooms} creatingItem={item.id.startsWith("temp-")} onSave={(value) => onPersist("rooms", value)} />
    </div>
  </div>;
}

function FloorPlanNumber({ value, onSave, compact = false }: { value: string | null; onSave: (value: string) => Promise<void>; compact?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();
  return <label className="flex min-w-0 flex-col gap-1">
    <span className={compact ? "sr-only" : "text-xs text-gray-500"}>Floor plan no.</span>
    <input key={value ?? ""} aria-label="Floor plan no." defaultValue={value ?? ""} placeholder="e.g. HD-01" disabled={pending} onBlur={(event) => {
      const next = event.target.value.trim();
      if (next === (value ?? "")) return;
      setError(null);
      startSave(async () => {
        try { await onSave(next); }
        catch (err) { setError(err instanceof Error ? err.message : "Could not save floor plan number."); }
      });
    }} className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none focus:border-brand-400 disabled:opacity-50" />
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </label>;
}

function StoreRoomSelect({ selected, rooms, onSave, emptyLabel = "Room / area…", creatingItem = false, compact = false, floating = false }: {
  selected: string[];
  rooms: string[];
  onSave: (value: string[]) => Promise<void>;
  emptyLabel?: string;
  creatingItem?: boolean;
  compact?: boolean;
  floating?: boolean;
}) {
  const [pending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [displayed, setDisplayed] = useOptimistic(selected);
  const options = [...new Set([...rooms, ...selected])];
  if (creatingItem) return <p className={cn("px-2 py-1 text-sm text-gray-500", !compact && "mb-3")} role="status">Adding equipment…</p>;

  return <div className={cn("min-w-0", !compact && "mb-3")}>
    <details className="relative rounded-md border border-gray-200 bg-white text-xs open:z-10">
      <summary className="cursor-pointer px-2 py-1" aria-label="Choose rooms">
        <span className="inline-block max-w-[calc(100%-1rem)] truncate align-bottom" title={displayed.join(", ")}>
          {displayed.length ? displayed.join(", ") : emptyLabel}
        </span>
      </summary>
      <fieldset disabled={pending} className={cn(
        "scroll-thin max-h-[11rem] min-w-0 overflow-y-auto overscroll-contain border-t border-gray-100 p-1 disabled:opacity-50",
        floating && "absolute inset-x-0 top-full mt-1 rounded-md border border-gray-200 bg-white shadow-lg"
      )}>
        <legend className="sr-only">Rooms (select multiple)</legend>
        {options.length === 0 && <p className="text-xs text-gray-500">Create rooms using the Rooms button.</p>}
        {options.map((name) => <label key={name} className="flex min-h-6 cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-gray-100">
          <input type="checkbox" checked={displayed.includes(name)} onChange={(event) => {
            const next = event.target.checked ? [...selected, name] : selected.filter((room) => room !== name);
            setError(null);
            startSave(async () => {
              setDisplayed(next);
              try { await onSave(next); }
              catch (err) { setError(err instanceof Error ? err.message : "Could not save rooms."); }
            });
          }} className="mt-0.5 accent-brand-600" />
          <span>{name}</span>
        </label>)}
      </fieldset>
    </details>
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </div>;
}

function CatalogItem({
  eq,
  added,
  onAdd,
  onPreview,
}: {
  eq: EquipmentDTO;
  added: boolean;
  onAdd: () => void;
  onPreview: () => void;
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
      <button type="button" onClick={onPreview} className="min-w-0 flex-1 rounded text-left hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`Preview ${eq.description.toUpperCase()}`}>
        <p className="truncate text-sm font-medium">{eq.description.toUpperCase()}</p>
        <PdfCaption filename={eq.pdfFilename} className="mt-0.5" />
        <p className="truncate text-xs text-gray-400">
          #{eq.masterItemNo}
          {eq.manufacturer ? ` · ${sentenceCase(eq.manufacturer)}` : ""}
          {eq.dimension ? ` · ${eq.dimension}` : ""}
        </p>
      </button>
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

const floorPlanCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

// shared column template for the schedule header + rows
const COLS =
  "grid-cols-[86px_20px_20px_26px_minmax(150px,1.5fr)_minmax(104px,0.9fr)_52px_minmax(150px,1.2fr)_176px]";

// equipment-schedule status options (mirror the audit Excel)
const statusKey = (v: string) => v.toLowerCase().replace(/\s+/g, "");
/** map a stored value to its canonical option (case/space-insensitive), else pass through */
function canonicalStatus(v: string | null): string {
  if (!v) return "";
  const k = statusKey(v);
  return STORE_STATUS_OPTIONS.find((o) => statusKey(o) === k) ?? v;
}

function StoreDropZone({
  items,
  catalogSpecUrls,
  initialGrouping,
  onGroupingChange,
  sortByNumber,
  onSortChange,
  onBulkUpdate,
  rooms,
  onRemove,
  onDuplicate,
  onPatch,
  onPersist,
  onAddCustom,
  onAddOmitted,
  onPreview,
  onOpenEquipment,
  onEdit,
  onReplace,
  onSaveRemarks,
}: {
  items: StoreItemDTO[];
  catalogSpecUrls: ReadonlyMap<string, string | null>;
  initialGrouping: StoreEquipmentGrouping;
  onGroupingChange: (mode: StoreEquipmentGrouping) => Promise<void>;
  sortByNumber: boolean;
  onSortChange: (sortByNumber: boolean) => void;
  onBulkUpdate: (ids: string[], changes: StoreItemPlacementPatch) => Promise<void>;
  rooms: string[];
  onRemove: (id: string) => void;
  onDuplicate: (it: StoreItemDTO) => void;
  onPatch: (id: string, p: Partial<StoreItemDTO>) => void;
  onPersist: (
    id: string,
    field: "quantity" | "rooms" | "proposeNew" | "scheduleNo",
    value: string | string[]
  ) => Promise<void>;
  onAddCustom: () => void;
  onAddOmitted: () => void;
  onPreview: (it: StoreItemDTO) => void;
  onOpenEquipment: (it: StoreItemDTO) => void;
  onEdit: (it: StoreItemDTO) => void;
  onReplace: (it: StoreItemDTO) => void;
  onSaveRemarks: (item: StoreItemDTO, value: string) => Promise<string | undefined>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "store-drop" });
  const [grouping, setGrouping] = useState(initialGrouping);
  const [groupingError, setGroupingError] = useState<string | null>(null);
  const [groupingPending, startGroupingSave] = useTransition();
  const grouped = grouping !== "none";
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkRooms, setBulkRooms] = useState<string[] | undefined>();
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkDrawingPage, setBulkDrawingPage] = useState<string>();
  const [bulkCustomGroup, setBulkCustomGroup] = useState<string>();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPending, startBulkSave] = useTransition();
  const selectableIds = items.filter((item) => !item.id.startsWith("temp-")).map((item) => item.id);
  const selectedIds = selectableIds.filter((id) => selection.has(id));
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const indexedItems = items.map((item, index) => ({ item, index }));
  const groups = new Map<string | null, typeof indexedItems>(
    grouping === "room" ? rooms.map((room) => [room, []]) : []
  );
  if (grouped) {
    for (const entry of indexedItems) {
      const { item } = entry;
      const assignments = grouping === "room"
        ? (item.rooms.length ? item.rooms : [null])
        : [grouping === "drawingPage" ? item.drawingPage : item.customGroup];
      for (const name of assignments) {
        const entries = groups.get(name);
        if (entries) entries.push(entry);
        else groups.set(name, [entry]);
      }
    }
  }
  const unassigned = groups.get(null);
  groups.delete(null);
  const orderedGroups = [...groups].filter(([, entries]) => entries.length > 0);
  if (grouping === "drawingPage") {
    orderedGroups.sort(([a], [b]) => (a ?? "").localeCompare(b ?? "", undefined, { numeric: true }));
  }
  if (unassigned) orderedGroups.push([null, unassigned]);
  const unassignedLabel = grouping === "drawingPage" ? "No drawing page"
    : grouping === "custom" ? "No custom group" : "Unassigned";

  function changeGrouping(mode: StoreEquipmentGrouping) {
    const previous = grouping;
    setGroupingError(null);
    setGrouping(mode);
    startGroupingSave(async () => {
      try {
        await onGroupingChange(mode);
      } catch {
        setGrouping(previous);
        setGroupingError("Could not save grouping. Try again.");
      }
    });
  }

  function renderRow({ item: it, index: idx }: (typeof indexedItems)[number]) {
    return (
      <SortableStoreRow
        key={it.id}
        grouped={grouped}
        item={it}
        catalogSpecUrl={it.equipmentId ? catalogSpecUrls.get(it.equipmentId) : undefined}
        rooms={rooms}
        index={idx + 1}
        reorderDisabled={sortByNumber || grouped}
        selected={selection.has(it.id)}
        selectionDisabled={bulkPending || it.id.startsWith("temp-")}
        onSelect={(checked) => setSelection((current) => {
          const next = new Set(current);
          if (checked) next.add(it.id);
          else next.delete(it.id);
          return next;
        })}
        onRemove={() => onRemove(it.id)}
        onDuplicate={() => onDuplicate(it)}
        onPatch={(p) => onPatch(it.id, p)}
        onPersist={(field, value) => onPersist(it.id, field, value)}
        onPreview={() => onPreview(it)}
        onOpenEquipment={() => onOpenEquipment(it)}
        onEdit={() => onEdit(it)}
        onReplace={() => onReplace(it)}
        onSaveRemarks={(value) => onSaveRemarks(it, value)}
      />
    );
  }

  function saveSelection() {
    setBulkError(null);
    const changes: StoreItemPlacementPatch = {};
    if (bulkRooms !== undefined) changes.rooms = bulkRooms;
    if (bulkStatus) changes.proposeNew = bulkStatus === "clear" ? null : bulkStatus;
    if (bulkDrawingPage !== undefined) changes.drawingPage = bulkDrawingPage.trim() || null;
    if (bulkCustomGroup !== undefined) changes.customGroup = bulkCustomGroup.trim() || null;
    startBulkSave(async () => {
      try {
        await onBulkUpdate(selectedIds, changes);
        setSelection(new Set());
        setBulkRooms(undefined);
        setBulkStatus("");
        setBulkDrawingPage(undefined);
        setBulkCustomGroup(undefined);
      } catch (error) {
        setBulkError(error instanceof Error ? error.message : "Could not update selected equipment.");
      }
    });
  }
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-2 shadow-sm backdrop-blur-md backdrop-saturate-150 transition",
        isOver ? "border-brand-400 bg-brand-50/40" : "border-white/60 bg-white/55"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-gray-700">Store equipment schedule</h2>
        <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Group equipment by"
          value={grouping}
          disabled={groupingPending}
          onChange={(event) => changeGrouping(event.target.value as StoreEquipmentGrouping)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
        >
          <option value="none">No grouping</option>
          <option value="room">Group by room</option>
          <option value="drawingPage">Group by drawing page</option>
          <option value="custom">Custom groups</option>
        </select>
        <select
          aria-label="Schedule order"
          value={sortByNumber ? "number" : "drawing"}
          onChange={(event) => onSortChange(event.target.value === "number")}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
        >
          <option value="drawing">Drawing order</option>
          <option value="number">Floor plan number</option>
        </select>
        <button type="button" onClick={onAddOmitted} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600"><Plus size={14} /> Omitted</button>
        <button
          onClick={onAddCustom}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600"
        >
          <PackagePlus size={14} /> Custom item
        </button>
        </div>
      </div>

      {groupingError && <p role="alert" className="px-4 py-1 text-xs text-red-600">{groupingError}</p>}

      {selectedIds.length > 0 && (
        <fieldset disabled={bulkPending} className="flex flex-wrap items-start gap-3 border-b border-gray-100 px-4 py-2 text-sm disabled:opacity-60">
          <span className="py-1 text-gray-600">{selectedIds.length} selected</span>
          <label className="flex items-center gap-1 py-1">
            <input type="checkbox" checked={bulkRooms !== undefined} onChange={(event) => setBulkRooms(event.target.checked ? [] : undefined)} />
            Replace rooms
          </label>
          {bulkRooms !== undefined && <StoreRoomSelect rooms={rooms} selected={bulkRooms} onSave={async (next) => setBulkRooms(next)} emptyLabel="Clear rooms" />}
          <select aria-label="Status for selected equipment" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1">
            <option value="">Keep status</option>
            <option value="clear">Clear status</option>
            {STORE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <label className="flex items-center gap-1 py-1">
            <input type="checkbox" checked={bulkCustomGroup !== undefined} onChange={(event) => setBulkCustomGroup(event.target.checked ? "" : undefined)} />
            Set custom group
          </label>
          {bulkCustomGroup !== undefined && (
            <input aria-label="Custom group name" value={bulkCustomGroup} maxLength={120}
              onChange={(event) => setBulkCustomGroup(event.target.value)} placeholder="Group name (blank to clear)"
              className="w-56 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm" />
          )}
          <label className="flex items-center gap-1 py-1">
            <input type="checkbox" checked={bulkDrawingPage !== undefined} onChange={(event) => setBulkDrawingPage(event.target.checked ? "" : undefined)} />
            Set drawing page
          </label>
          {bulkDrawingPage !== undefined && (
            <input aria-label="Drawing page" value={bulkDrawingPage} maxLength={120}
              onChange={(event) => setBulkDrawingPage(event.target.value)} placeholder="e.g. K1.2 (blank to clear)"
              className="w-48 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm" />
          )}
          <button type="button" onClick={saveSelection} disabled={bulkRooms === undefined && !bulkStatus && bulkDrawingPage === undefined && bulkCustomGroup === undefined} className="rounded-md bg-brand-600 px-3 py-1 font-medium text-white disabled:opacity-50">
            {bulkPending ? "Saving…" : "Apply"}
          </button>
          {bulkError && <p role="alert" className="w-full text-red-600">{bulkError}</p>}
        </fieldset>
      )}

      {items.length === 0 ? (
        <div className="m-3 flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
          Drag equipment here, or click + on a catalog item
        </div>
      ) : (
        <div className="scroll-thin min-h-0 min-w-0 flex-1 overflow-auto p-2">
          {/* header row */}
          <div
            className={cn(
              "sticky top-0 z-10 mb-1 grid min-w-[1000px] items-center gap-2 bg-white/70 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur",
              COLS
            )}
          >
            <span>Floor plan no.</span>
            <input
              type="checkbox"
              aria-label="Select all equipment"
              ref={(input) => { if (input) input.indeterminate = selectedIds.length > 0 && !allSelected; }}
              checked={allSelected}
              disabled={bulkPending || !selectableIds.length}
              onChange={(event) => setSelection(new Set(event.target.checked ? selectableIds : []))}
            />
            <span />
            <span>#</span>
            <span>Equipment</span>
            <span>Dimension</span>
            <span>Qty</span>
            <span>Room</span>
            <span>Status</span>
          </div>
          {grouped ? (
            <div className="min-w-[1000px]">
              {orderedGroups.map(([name, entries]) => (
                <details key={JSON.stringify([grouping, name])} className="group/room mb-1">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/50 bg-white/65 px-3 py-2 text-sm font-medium text-gray-800 hover:border-brand-200 [&::-webkit-details-marker]:hidden">
                    <ChevronRight size={14} aria-hidden="true" className="group-open/room:hidden" />
                    <ChevronDown size={14} aria-hidden="true" className="hidden group-open/room:block" />
                    {name ?? unassignedLabel}
                    <span className="text-xs font-normal text-gray-500">{entries.length} {entries.length === 1 ? "item" : "items"}</span>
                  </summary>
                  <div className="mt-1">{entries.map(renderRow)}</div>
                </details>
              ))}
            </div>
          ) : (
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="min-w-[1000px]">{indexedItems.map(renderRow)}</div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

function SortableStoreRow({
  item,
  grouped,
  catalogSpecUrl,
  rooms,
  index,
  reorderDisabled,
  selected,
  selectionDisabled,
  onSelect,
  onRemove,
  onDuplicate,
  onPatch,
  onPersist,
  onPreview,
  onOpenEquipment,
  onEdit,
  onReplace,
  onSaveRemarks,
}: {
  item: StoreItemDTO;
  grouped: boolean;
  catalogSpecUrl?: string | null;
  rooms: string[];
  index: number;
  reorderDisabled: boolean;
  selected: boolean;
  selectionDisabled: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPatch: (p: Partial<StoreItemDTO>) => void;
  onPersist: (field: "quantity" | "rooms" | "proposeNew" | "scheduleNo", value: string | string[]) => Promise<void>;
  onPreview: () => void;
  onOpenEquipment: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onSaveRemarks: (value: string) => Promise<string | undefined>;
}) {
  const instanceId = useId();
  const specUrl = splitStoreSpecSource(item.remarks).specSource ?? catalogSpecUrl;
  const [remarksExpanded, setRemarksExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: grouped ? `grouped:${instanceId}` : item.id,
    disabled: { draggable: reorderDisabled, droppable: grouped },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group mb-1 grid items-start gap-x-2 gap-y-1 rounded-lg border border-white/50 bg-white/45 px-2 py-2 hover:border-brand-200 hover:bg-white/65",
        COLS,
        isDragging && "z-20 opacity-80 shadow-md"
      )}
    >
      <FloorPlanNumber value={item.scheduleNo} compact onSave={(value) => onPersist("scheduleNo", value)} />
      <input
        type="checkbox"
        aria-label={`Select item ${index}: ${item.description.toUpperCase()}`}
        checked={selected}
        disabled={selectionDisabled}
        onChange={(event) => onSelect(event.target.checked)}
        className="mt-2"
      />
      <button
        {...attributes}
        {...listeners}
        disabled={reorderDisabled}
        aria-label={`Reorder item ${index}`}
        className="mt-1 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>
      <span className="mt-1 font-mono text-xs text-gray-400">{index}</span>

      {/* equipment: description, manufacturer, ALL department tags, pdf preview */}
      <div className="min-w-0">
        <div className="flex items-start gap-1.5">
          <button type="button" onClick={onOpenEquipment} aria-label={`Preview ${item.description.toUpperCase()}`} className="min-w-0 flex-1 rounded text-left text-sm font-medium leading-snug text-gray-800 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-400">
            {item.description.toUpperCase()}
          </button>
          {item.pdfUrl ? (
            <button
              type="button"
              onClick={onPreview}
              className="mt-0.5 shrink-0 rounded p-0.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600"
              title="Preview spec PDF"
            >
              <FileText size={14} />
            </button>
          ) : specUrl && /^https?:\/\//i.test(specUrl) && (
            <a
              href={specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 shrink-0 rounded p-0.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600"
              title="Open specification link"
              aria-label={`Open specification link for ${item.description.toUpperCase()}`}
            >
              <Link2 size={14} />
            </a>
          )}
        </div>
        <PdfCaption filename={item.pdfFilename} className="mt-0.5" />
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {item.manufacturer && (
            <span className="truncate text-xs text-gray-400">{sentenceCase(item.manufacturer)}</span>
          )}
          {item.drawingPage && <span className="break-all rounded bg-gray-100 px-1 text-[10px] text-gray-500" title="Drawing page">{item.drawingPage}</span>}
          {item.customGroup && <span className="break-words rounded bg-gray-100 px-1 text-[10px] text-gray-500" title="Custom group">{item.customGroup}</span>}
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

      <label className="flex min-w-0 flex-col gap-1">
      <span className="sr-only">Quantity</span>
      <input
        type="number"
        min={0}
        step="1"
        defaultValue={item.quantity}
        onChange={(e) => onPatch({ quantity: parseFloat(e.target.value) || 0 })}
        onBlur={(e) => onPersist("quantity", e.target.value)}
        className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-center text-sm outline-none focus:border-brand-400"
      />
      </label>
      <StoreRoomSelect compact selected={item.rooms} rooms={rooms} creatingItem={item.id.startsWith("temp-")} onSave={async (value) => { await onPersist("rooms", value); }} />
      <div className="flex items-start gap-1">
        {(() => {
          const status = canonicalStatus(item.proposeNew);
          const extra = status && !STORE_STATUS_OPTIONS.includes(status as (typeof STORE_STATUS_OPTIONS)[number]);
          return (
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => {
                onPatch({ proposeNew: e.target.value || null });
                onPersist("proposeNew", e.target.value);
              }}
              className="h-[30px] min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-sm outline-none focus:border-brand-400"
            >
              <option value="">—</option>
              {STORE_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              {extra && <option value={status}>{status}</option>}
            </select>
          );
        })()}
        <div className={cn("flex shrink-0 flex-col items-center gap-1 transition group-hover:opacity-100 group-focus-within:opacity-100", !selected && "lg:opacity-0")}>
          <div className="flex items-center">
            <button
              onClick={onDuplicate}
              className="shrink-0 rounded p-1 text-gray-300 hover:bg-brand-50 hover:text-brand-600"
              title="Duplicate as custom item"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onEdit}
              className="shrink-0 rounded p-1 text-gray-300 hover:bg-brand-50 hover:text-brand-600"
              title={item.equipmentId ? "Edit equipment" : "Edit custom item"}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onRemove}
              className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <button
            type="button"
            disabled={item.id.startsWith("temp-")}
            onClick={onReplace}
            className="whitespace-nowrap rounded px-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
          >
            Replace by
          </button>
        </div>
      </div>
      <StoreItemRemarks
        key={JSON.stringify([item.equipmentId, item.remarks])}
        item={item}
        expanded={remarksExpanded}
        onToggle={() => setRemarksExpanded((current) => !current)}
        onSave={onSaveRemarks}
      />
    </div>
  );
}


function StoreItemRemarks({ item, expanded, onToggle, onSave }: {
  item: StoreItemDTO;
  expanded: boolean;
  onToggle: () => void;
  onSave: (value: string) => Promise<string | undefined>;
}) {
  const remarksId = useId();
  const [value, setValue] = useState(item.remarks ?? "");
  const [error, setError] = useState<string>();
  const [pending, startSave] = useTransition();

  function save() {
    const next = value.trim();
    if (pending || next === (item.remarks ?? "")) return;
    setError(undefined);
    startSave(async () => {
      try {
        setError(await onSave(next));
      } catch {
        setError("Could not save remarks.");
      }
    });
  }

  return (
    <div className="col-span-4 col-start-6 min-w-0">
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={expanded ? "Collapse remarks" : "Expand remarks"}
          aria-expanded={expanded}
          aria-controls={remarksId}
          onClick={onToggle}
          className="flex h-6 w-3 shrink-0 items-center justify-center rounded text-sm leading-none text-brand-600 hover:bg-brand-50"
        >
          {expanded ? "−" : "+"}
        </button>
        <label htmlFor={remarksId} className="shrink-0 py-1 text-[10px] font-semibold tracking-wide text-gray-500">
          REMARK/NOTES:
        </label>
        <textarea
          id={remarksId}
          aria-label={`Remarks for ${item.description.toUpperCase()}`}
          rows={expanded ? 3 : 1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          readOnly={pending}
          disabled={item.id.startsWith("temp-")}
          className={cn(
            "min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-brand-400 disabled:opacity-50",
            expanded ? "field-sizing-content min-h-16 max-h-40 resize-y" : "h-6 resize-none"
          )}
        />
      </div>
      {pending && <span role="status" className="text-xs text-gray-500">Saving…</span>}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <span role="alert">{error}</span>
          <button type="button" onClick={save} className="font-medium underline">Retry</button>
        </div>
      )}
    </div>
  );
}
