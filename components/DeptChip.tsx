import { deptStyle } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DeptChip({ dept, className }: { dept: string; className?: string }) {
  const s = deptStyle(dept);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        s.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {dept}
    </span>
  );
}
