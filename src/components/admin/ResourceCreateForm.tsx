"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createResource } from "@/app/actions/resources";
import type { ResourceCtaType } from "@/types/database";

const CATEGORIES = ["Career & Job Search", "Leadership & Coaching", "HR & Team Operations"];
const CTA_TYPES: ResourceCtaType[] = ["Buy Now", "Download"];

export function ResourceCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [price, setPrice] = React.useState("Free");
  const [ctaType, setCtaType] = React.useState<ResourceCtaType>("Download");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createResource({ title, description, category, price, ctaType });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Resource created — now add its file or link.");
      router.push(`/admin/resources/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-neutral-200 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Resume Template Pack" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
          placeholder="A short summary shown on the resource card."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price <span className="text-red-500">*</span></Label>
          <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Free or $19" />
          <p className="text-xs text-neutral-400">Use “Free” or a dollar amount like “$19”.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cta_type">Type <span className="text-red-500">*</span></Label>
          <select
            id="cta_type"
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value as ResourceCtaType)}
            className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {CTA_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-400">“Download” = free download. “Buy Now” = paid (checkout wiring is separate).</p>
        </div>
      </div>

      <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        The resource starts <strong>hidden</strong>. After you create it, you&apos;ll add the downloadable file (or link) and can switch it on.
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create & add file"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/resources")} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
