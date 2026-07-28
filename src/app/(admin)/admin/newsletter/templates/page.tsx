import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus, FileEdit, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCentralDate } from "@/lib/time/central";

export const metadata: Metadata = {
  title: "Templates — Newsletter",
  robots: { index: false, follow: false },
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
};

export default async function TemplatesPage() {
  const supabase = createServiceClient();
  const { data: rowsRaw } = await supabase
    .from("newsletter_templates")
    .select("id, name, description, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  const rows = (rowsRaw ?? []) as TemplateRow[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/newsletter"
          className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to newsletter
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">Templates</h1>
            <p className="text-sm text-neutral-500 mt-1">Reusable section layouts. The default one pre-fills every new issue.</p>
          </div>
          <Button asChild>
            <Link href="/admin/newsletter/templates/new">
              <Plus className="h-4 w-4" /> New template
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200">
        {rows.length === 0 ? (
          <EmptyState
            icon={FileEdit}
            title="No templates yet."
            description="The default template should have been seeded by the migration."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/admin/newsletter/templates/${tpl.id}`}
                className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {tpl.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                    <p className="font-medium text-neutral-900 text-sm">{tpl.name}</p>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-neutral-500">{tpl.description}</p>
                  )}
                </div>
                <p className="text-xs text-neutral-400 flex-shrink-0">
                  {formatCentralDate(tpl.created_at, { month: "short", day: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
