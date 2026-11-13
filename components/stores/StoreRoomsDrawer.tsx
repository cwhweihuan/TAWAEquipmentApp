"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { saveStoreRooms } from "@/app/actions/store";

export function StoreRoomsDrawer({ storeId, rooms, onClose, onSaved }: {
  storeId: string;
  rooms: string[];
  onClose: () => void;
  onSaved: (rooms: string[], renames: Map<string, string>) => void;
}) {
  const [entries, setEntries] = useState(rooms.map((name, id) => ({ id, original: name as string | null, name })));
  const [nextId, setNextId] = useState(rooms.length);
  const [pending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, pending]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => { if (!pending) onClose(); }} />
      <aside role="dialog" aria-modal="true" aria-labelledby="rooms-title" className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="rooms-title" className="font-semibold text-gray-900">Remodel rooms</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close rooms" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startSave(async () => {
            try {
              const saved = await saveStoreRooms(storeId, rooms, entries);
              onSaved(saved, new Map(entries.filter((entry) => entry.original !== null).map((entry) => [entry.original!, entry.name.trim()])));
              onClose();
            } catch (err) { setError(err instanceof Error ? err.message : "Could not save rooms."); }
          });
        }}>
          <fieldset disabled={pending} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
            <p className="text-sm text-gray-500">Create room names for this store. Renaming a room also updates its equipment. Move equipment out of a room before removing it.</p>
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex gap-2">
                <input aria-label={`Room name ${index + 1}`} value={entry.name} required maxLength={120} onChange={(event) => setEntries((current) => current.map((room) => room.id === entry.id ? { ...room, name: event.target.value } : room))} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
                <button type="button" aria-label={`Remove room ${index + 1}`} onClick={() => setEntries((current) => current.filter((room) => room.id !== entry.id))} className="rounded-lg p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => {
              setEntries((current) => [...current, { id: nextId, original: null, name: "" }]);
              setNextId((id) => id + 1);
            }} className="flex items-center gap-1 text-sm font-medium text-brand-600"><Plus size={16} /> Add room</button>
          </fieldset>
          {error && <p role="alert" className="px-5 pb-3 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end border-t border-gray-200 p-4">
            <button type="submit" disabled={pending} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{pending ? "Saving…" : "Save rooms"}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
