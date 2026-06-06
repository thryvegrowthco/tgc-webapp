"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Tag,
  Activity,
  Megaphone,
  Briefcase,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateTrackingPixel } from "@/app/actions/tracking-pixels";
import type { TrackingPixel } from "@/types/database";

const PROVIDER_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  google_analytics_4: BarChart3,
  google_tag_manager: Tag,
  meta_pixel: Activity,
  google_ads: Megaphone,
  linkedin_insight: Briefcase,
  microsoft_clarity: Eye,
};

export function TrackingPixelCard({ pixel }: { pixel: TrackingPixel }) {
  const router = useRouter();
  const Icon = PROVIDER_ICON[pixel.provider] ?? BarChart3;
  const [pixelId, setPixelId] = React.useState(pixel.pixel_id ?? "");
  const [enabled, setEnabled] = React.useState(pixel.enabled);
  const [pending, startTransition] = React.useTransition();

  // Re-sync when the server payload changes (e.g., after router.refresh()).
  React.useEffect(() => {
    setPixelId(pixel.pixel_id ?? "");
    setEnabled(pixel.enabled);
  }, [pixel.pixel_id, pixel.enabled]);

  const dirty =
    (pixelId.trim() || null) !== (pixel.pixel_id ?? null) || enabled !== pixel.enabled;
  const live = pixel.enabled && pixel.pixel_id && pixel.pixel_id.length > 0;

  function handleSave() {
    startTransition(async () => {
      const result = await updateTrackingPixel({ id: pixel.id, pixelId, enabled });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${pixel.name} saved.`);
      router.refresh();
    });
  }

  return (
    <section className="bg-white border border-neutral-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-brand-50 rounded-lg flex-shrink-0">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-neutral-900">{pixel.name}</h3>
            {live && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Live
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">{pixel.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`pixel-${pixel.id}`}>Pixel ID</Label>
              <Input
                id={`pixel-${pixel.id}`}
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder={pixel.id_placeholder ?? "Paste ID"}
                spellCheck={false}
                autoCapitalize="off"
              />
            </div>

            <label className="inline-flex items-center gap-3 cursor-pointer pb-2">
              <span className="text-sm text-neutral-700">Enabled</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                  enabled ? "bg-brand-600" : "bg-neutral-300"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-neutral-500">
              Scripts fire only after a visitor accepts cookies. Visitors who decline never see the tracker.
            </p>
            <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || pending}>
              {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
