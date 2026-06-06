"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateResource } from "@/app/actions/resources";
import type { Resource, ResourceCtaType } from "@/types/database";

const CATEGORIES = [
  "Career & Job Search",
  "Leadership & Coaching",
  "HR & Team Operations",
];

const CTA_TYPES: ResourceCtaType[] = ["Buy Now", "Download"];

interface ResourceEditFormProps {
  resource: Resource;
}

export function ResourceEditForm({ resource }: ResourceEditFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [enabled, setEnabled] = React.useState(resource.enabled);
  const [title, setTitle] = React.useState(resource.title);
  const [description, setDescription] = React.useState(resource.description);
  const [category, setCategory] = React.useState(resource.category);
  const [price, setPrice] = React.useState(resource.price);
  const [ctaType, setCtaType] = React.useState<ResourceCtaType>(resource.cta_type);
  const [sortOrder, setSortOrder] = React.useState(String(resource.sort_order));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateResource({
        id: resource.id,
        title,
        description,
        category,
        price,
        ctaType,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        enabled,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Resource saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-neutral-200 p-6">
      {/* Enabled toggle */}
      <label className="flex items-start gap-3 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm">
          <span className="font-medium text-neutral-900">Show on /resources</span>
          <span className="block text-xs text-neutral-500 mt-0.5">
            When off, this resource is hidden from the public page. When on, the card shows with a “Coming soon” badge in place of the Buy/Download button.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
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
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price <span className="text-red-500">*</span></Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Free or $19"
            required
          />
          <p className="text-xs text-neutral-400">Use “Free” or a dollar amount like “$19”.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cta_type">CTA type <span className="text-red-500">*</span></Label>
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
          <p className="text-xs text-neutral-400">Determines the eventual button style.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            type="number"
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <p className="text-xs text-neutral-400">Lower numbers show first.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/resources")} disabled={pending}>
          Back to resources
        </Button>
      </div>
    </form>
  );
}
