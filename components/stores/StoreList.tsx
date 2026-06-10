"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { createStore, deleteStore } from "@/app/actions/store";

type StoreRow = {
  id: string;
  number: string;
  name: string;
  location: string | null;
  _count: { items: number };
};

export function StoreList({ stores }: { stores: StoreRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const id = await createStore(fd);
      router.push(`/stores/${id}`);
    });
  }

  function onDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete store ${name}?`)) return;
    start(async () => {
      await deleteStore(id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500">{stores.length} store buildouts</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-200 transition hover:bg-brand-700"
        >
          <Plus size={16} /> New store
        </button>
      </div>

      {creating && (
        <form
          onSubmit={onCreate}
          className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-fade-in"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Store number</span>
            <input
              name="number"
              required
              placeholder="100"
              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Location</span>
            <input
              name="location"
              placeholder="SEATTLE, WA"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 size={15} className="animate-spin" />} Create & open
          </button>
        </form>
      )}

      {stores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center text-sm text-gray-400">
          No stores yet. Create one to start adding equipment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={`/stores/${s.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-100"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-300 to-rose-400 text-white shadow-sm shadow-brand-200">
                <Store size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-gray-900">#{s.number}</h3>
                <p className="truncate text-sm text-gray-500">{s.location || "—"}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Package size={14} /> {s._count.items}
              </span>
              <button
                onClick={(e) => onDelete(e, s.id, s.name)}
                className="rounded-lg p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete store"
              >
                <Trash2 size={15} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
