import type { EquipmentDTO } from "@/lib/types";
import { sentenceCase } from "@/lib/utils";
import { DeptChip } from "@/components/DeptChip";
import { PdfCaption } from "./PdfCaption";

export function EquipmentList({ items, onSelect }: {
  items: EquipmentDTO[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white/40">
      <table className="w-full min-w-[800px] text-left text-xs">
        <caption className="sr-only">Equipment catalog</caption>
        <thead className="border-b border-gray-200 bg-white/40 text-gray-500">
          <tr>
            {["Equipment / Created (UTC)", "Manufacturer / Model", "Dimensions", "Departments", "Links"].map((label) => (
              <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-white/40">
              <td className="max-w-sm px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-brand-600">#{item.masterItemNo}</span>
                  <time dateTime={item.createdAt} className="text-[10px] text-gray-500">Created {item.createdAt.slice(0, 10)}</time>
                </div>
                <button type="button" onClick={() => onSelect(item.id)} className="text-left text-sm font-semibold text-gray-900 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-400">
                  {sentenceCase(item.description)}
                </button>
                <PdfCaption filename={item.pdfFilename} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                <p>{sentenceCase(item.manufacturer) || "—"}</p>
                <p>{sentenceCase(item.model) || "—"}</p>
              </td>
              <td className="px-4 py-3 text-brand-600">{sentenceCase(item.dimension) || "—"}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{item.departments.map((dept) => <DeptChip key={dept} dept={dept} />)}</div></td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-2 text-brand-600">
                  {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" aria-label={`Open spec PDF for ${sentenceCase(item.description)}`}>PDF ↗</a>}
                  {item.specUrl && <a href={item.specUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap hover:underline" aria-label={`Open official product page for ${sentenceCase(item.description)}`}>Official site ↗</a>}
                  {!item.pdfUrl && !item.specUrl && <span className="text-gray-400">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
