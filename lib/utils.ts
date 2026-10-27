import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The nine departments in the master equipment sheet, in canonical order. */
export const DEPARTMENTS = [
  "MEAT",
  "SEAFOOD",
  "PRODUCE",
  "GROCERY",
  "BAKERY",
  "HOT DELI",
  "WAREHOUSE",
  "GENERAL MARKET",
  "SUBTENANTS",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/** Consistent accent color per department (tailwind classes). */
export const DEPT_STYLE: Record<string, { dot: string; chip: string }> = {
  MEAT: { dot: "bg-rose-500", chip: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  SEAFOOD: { dot: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  PRODUCE: { dot: "bg-green-500", chip: "bg-green-500/15 text-green-300 ring-green-500/30" },
  GROCERY: { dot: "bg-amber-500", chip: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  BAKERY: { dot: "bg-orange-500", chip: "bg-orange-500/15 text-orange-300 ring-orange-500/30" },
  "HOT DELI": { dot: "bg-red-500", chip: "bg-red-500/15 text-red-300 ring-red-500/30" },
  WAREHOUSE: { dot: "bg-slate-400", chip: "bg-slate-400/15 text-slate-300 ring-slate-400/30" },
  "GENERAL MARKET": { dot: "bg-violet-500", chip: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  SUBTENANTS: { dot: "bg-teal-500", chip: "bg-teal-500/15 text-teal-300 ring-teal-500/30" },
};

export function deptStyle(d: string) {
  return DEPT_STYLE[d] ?? { dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600 ring-gray-200" };
}

/** Solid accent hex per department (for inline styles like active filter chips). */
export const DEPT_HEX: Record<string, string> = {
  MEAT: "#f43f5e",
  SEAFOOD: "#0ea5e9",
  PRODUCE: "#22c55e",
  GROCERY: "#f59e0b",
  BAKERY: "#f97316",
  "HOT DELI": "#dc2626",
  WAREHOUSE: "#64748b",
  "GENERAL MARKET": "#8b5cf6",
  SUBTENANTS: "#14b8a6",
};

export function deptHex(d: string) {
  return DEPT_HEX[d] ?? "#9ca3af";
}
