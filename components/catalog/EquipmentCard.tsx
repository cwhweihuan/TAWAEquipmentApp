"use client";

import { Box, ExternalLink, FileText, Link2, Ruler } from "lucide-react";
import type { EquipmentDTO } from "@/lib/types";
import { BIM_STATUS_OPTIONS } from "@/lib/types";
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
  const bimStatus = BIM_STATUS_OPTIONS.find((status) => status.value === item.bimStatus);

  return (
    <article
      className={cn(
        "group flex w-full flex-col gap-2 rounded-2xl border border-white/50 bg-white/40 p-3 text-left shadow-sm backdrop-blur-md backdrop-saturate-150 transition",
        "hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white/65 hover:shadow-md hover:shadow-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label={`Open equipment #${item.masterItemNo}, ${item.description}`}
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
      <div className="flex flex-col gap-1 border-t border-brand-100/70 pt-2">
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-gray-600">
          <Box size={13} className="shrink-0 text-brand-500" />
          <span className="truncate">BIM · {bimStatus?.label ?? "未建立"}</span>
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {item.specUrl && (
            <a
              href={item.specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
              aria-label={`Open official product page for ${item.description}`}
            >
              Official site <ExternalLink size={11} />
            </a>
          )}
          {item.bimModelUrl && (
            <a
              href={item.bimModelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
              aria-label={`Open 3D preview for ${item.description}`}
            >
              3D Preview <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
