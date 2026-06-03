"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ServiceAgreementEditor } from "@/components/admin/ServiceAgreementEditor";
import { updateAgreementDraft, publishNewVersion } from "@/app/actions/legal";
import type { JSONContent } from "@tiptap/react";

interface InitialData {
  id: string;
  title: string;
  versionLabel: string;
  content: JSONContent;
}

interface ServiceAgreementFormProps {
  initial: InitialData;
}

export function ServiceAgreementForm({ initial }: ServiceAgreementFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initial.title);
  const [content, setContent] = React.useState<JSONContent>(initial.content);
  const [newVersionLabel, setNewVersionLabel] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const result = await updateAgreementDraft({ title, content });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const version = newVersionLabel.trim();
    if (!version) {
      toast.error("Pick a version label (e.g. v2, 2026-07-01)");
      return;
    }
    if (
      !window.confirm(
        `Publish "${version}" as the new current Service Agreement? All clients who signed an earlier version will be asked to re-sign at their next booking.`
      )
    )
      return;

    setSaving(true);
    try {
      const result = await publishNewVersion({
        versionLabel: version,
        title,
        content,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Published ${version}`);
      setNewVersionLabel("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Current version</Label>
          <Input value={initial.versionLabel} disabled className="bg-neutral-50" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Body</Label>
        <ServiceAgreementEditor initialContent={content} onChange={setContent} />
        <p className="text-xs text-neutral-500">
          Headings, bold/italic, lists, and links. No images — keeps the document accessible in print + email.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-neutral-900 text-sm mb-1">Save changes</h3>
          <p className="text-xs text-neutral-500 mb-3">
            <strong>Save draft</strong> updates the current version&apos;s content (no new version). Use for small edits to the live document. Already-signed records keep their snapshot, so no client is affected.
          </p>
          <Button onClick={handleSaveDraft} disabled={saving} variant="outline">
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>

        <hr className="border-neutral-100" />

        <div>
          <h3 className="font-semibold text-neutral-900 text-sm mb-1">Publish new version</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Use for meaningful term changes. Clients will be asked to re-sign on their next booking.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <Input
              placeholder="New version label (e.g. v2, 2026-07-01)"
              value={newVersionLabel}
              onChange={(e) => setNewVersionLabel(e.target.value)}
            />
            <Button onClick={handlePublish} disabled={saving || !newVersionLabel.trim()}>
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
