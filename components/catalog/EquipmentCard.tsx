"use client";

import { FileText, Link2, Ruler } from "lucide-react";
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
        "group flex w-full flex-col gap-2 rounded-2xl border border-brand-100 bg-white p-3 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-600">
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

      {item.dimension && (
        <p className="flex items-center gap-1 text-xs font-medium text-brand-600">
          <Ruler size={12} className="shrink-0" />
          <span className="line-clamp-1">{item.dimension}</span>
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
