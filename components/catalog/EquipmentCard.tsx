"use client";

import { FileText, Link2 } from "lucide-react";
import type { EquipmentDTO } from "@/lib/types";
import { DeptChip } from "@/components/DeptChip";
import { cn } from "@/lib/utils";

export function EquipmentCard({
  item,
  onClick,
  compact = false,
}: {
  item: EquipmentDTO;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-gray-500">
          #{item.masterItemNo}
        </span>
        {item.pdfUrl ? (
          item.pdfDownloaded ? (
            <FileText size={14} className="text-brand-600" aria-label="Spec PDF stored" />
          ) : (
            <Link2 size={14} className="text-amber-500" aria-label="Spec link (Drive)" />
          )
        ) : null}
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
        {item.description}
      </h3>

      {(item.manufacturer || item.model) && (
        <p className="line-clamp-1 text-xs text-gray-500">
          {[item.manufacturer, item.model].filter(Boolean).join(" · ")}
        </p>
      )}

      {!compact && item.departments.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {item.departments.slice(0, 3).map((d) => (
            <DeptChip key={d} dept={d} />
          ))}
          {item.departments.length > 3 && (
            <span className="text-[11px] text-gray-400">+{item.departments.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}
