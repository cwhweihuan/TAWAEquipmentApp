"use client";

import { useId, useRef, useState } from "react";
import { ArrowUp, Plus, Search, X } from "lucide-react";
import Link from "next/link";

export function FloatingSearch({ value, onChange, resultCount, onShowResults }: {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  onShowResults: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="floating-equipment-search fixed right-4 z-30 bottom-[max(1rem,env(safe-area-inset-bottom))] max-w-[calc(100vw-2rem)] sm:right-6">
      {open && (
        <form
          id={panelId}
          role="search"
          aria-label="Quick equipment search"
          className="mb-3 w-80 max-w-full rounded-2xl border border-brand-200 bg-white p-4 shadow-xl"
          onSubmit={(event) => {
            event.preventDefault();
            onShowResults();
            close();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        >
          <label htmlFor={`${panelId}-input`} className="mb-2 block text-sm font-semibold text-gray-900">Search equipment</label>
          <div className="relative">
            <input
              id={`${panelId}-input`}
              type="search"
              autoFocus
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Equipment, PDF, model…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-base text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-900"><X size={16} /></button>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span role="status" className="text-xs text-gray-500">{resultCount} results</span>
            <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">View results</button>
          </div>
        </form>
      )}
      <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        aria-label="Back to top"
        title="Back to top"
        onClick={() => window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        })}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-full border border-brand-300 bg-brand-600 text-white shadow-lg hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <ArrowUp size={20} aria-hidden="true" />
      </button>
      <Link
        href="/catalog/new"
        className="flex min-h-12 items-center gap-1.5 rounded-full border border-brand-300 bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        <Plus size={20} aria-hidden="true" /> Add equipment
      </Link>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 items-center gap-2 rounded-full border border-brand-300 bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        {open ? <X size={20} /> : <Search size={20} />}
        {open ? "Close" : "Search"}
      </button>
      </div>
    </div>
  );
}
