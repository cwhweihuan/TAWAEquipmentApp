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
  MEAT: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  SEAFOOD: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  PRODUCE: { dot: "bg-green-500", chip: "bg-green-50 text-green-700 ring-green-200" },
  GROCERY: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  BAKERY: { dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700 ring-orange-200" },
  "HOT DELI": { dot: "bg-red-600", chip: "bg-red-50 text-red-700 ring-red-200" },
  WAREHOUSE: { dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-300" },
  "GENERAL MARKET": { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  SUBTENANTS: { dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700 ring-teal-200" },
};

export function deptStyle(d: string) {
  return DEPT_STYLE[d] ?? { dot: "bg-gray-400", chip: "bg-gray-50 text-gray-600 ring-gray-200" };
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
