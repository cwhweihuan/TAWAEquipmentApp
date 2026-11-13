"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Plus, Trash2, Package, Loader2, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [view, setView] = useState<"cards" | "list">("cards");
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500">{stores.length} store buildouts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Stores display" className="flex rounded-lg border border-gray-200 bg-white p-1">
          {(["cards", "list"] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand-400", view === mode ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50")}>
              {mode === "cards" ? <LayoutGrid size={15} /> : <List size={15} />}{mode === "cards" ? "Cards" : "List"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-200 transition hover:bg-brand-700"
        >
          <Plus size={16} /> New store
        </button>
        </div>
      </div>

      {creating && (
        <form
          onSubmit={onCreate}
          className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-md animate-fade-in"
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
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white/45">
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="sr-only">Stores</caption>
            <thead className="border-b border-gray-200 bg-white/70 text-xs text-gray-500">
              <tr>{["Store no.", "Store name", "Location", "Equipment", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((s) => <tr key={s.id} className="hover:bg-white/50">
                <td className="px-4 py-3 font-mono text-gray-500">#{s.number}</td>
                <td className="px-4 py-3"><Link href={`/stores/${s.id}`} className="font-semibold text-gray-900 hover:text-brand-600">{s.name}</Link></td>
                <td className="px-4 py-3 text-gray-500">{s.location || "—"}</td>
                <td className="px-4 py-3 tabular-nums text-gray-500">{s._count.items}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-3">
                  <Link href={`/stores/${s.id}`} className="font-medium text-brand-600 hover:underline">Open</Link>
                  <button type="button" onClick={(e) => onDelete(e, s.id, s.name)} disabled={pending} aria-label={`Delete store ${s.number}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><Trash2 size={15} /></button>
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <Link
              key={s.id}
              href={`/stores/${s.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-white/50 bg-white/45 p-4 shadow-sm backdrop-blur-md backdrop-saturate-150 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white/65 hover:shadow-md hover:shadow-brand-100"
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
