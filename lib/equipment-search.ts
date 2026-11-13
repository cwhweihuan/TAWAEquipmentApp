/** Keep display names separate from the actual filename and Storage path. */
export function pdfDisplayName(filename: string): string {
  return filename.replace(/\.pdf$/i, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

export function searchTerms(query: string): string[] {
  return query.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function matchesEquipmentSearch(item: {
  description: string;
  manufacturer: string | null;
  model: string | null;
  masterItemNo: number;
  pdfFilename?: string | null;
}, query: string): boolean {
  const haystack = searchTerms([
    item.description, item.manufacturer, item.model, item.masterItemNo, item.pdfFilename,
  ].filter(value => value !== null && value !== undefined).join(" ")).join(" ");
  return searchTerms(query).every(term => haystack.includes(term));
}
