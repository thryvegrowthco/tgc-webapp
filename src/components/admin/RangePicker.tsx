import Link from "next/link";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type RangePreset } from "@/lib/reporting/range";

/** Zero-JS segmented control — each preset is a link to `?range=<preset>`. */
export function RangePicker({ active }: { active: RangePreset }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
      {RANGE_PRESETS.map((r) => (
        <Link
          key={r.value}
          href={`?range=${r.value}`}
          scroll={false}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            active === r.value ? "bg-brand-500 text-white" : "text-neutral-600 hover:bg-neutral-50"
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
