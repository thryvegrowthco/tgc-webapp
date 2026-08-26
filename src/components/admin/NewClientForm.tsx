"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gift, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClientAccount } from "@/app/actions/clients";

export function NewClientForm() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Set when the email is already taken, so we can offer a link instead of a
  // dead-end error.
  const [existingId, setExistingId] = React.useState<string | null>(null);

  const [sendInvite, setSendInvite] = React.useState(true);
  const [grantWatchlist, setGrantWatchlist] = React.useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setExistingId(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const result = await createClientAccount({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      sendInvite,
      grantWatchlist,
      compNote: String(form.get("compNote") ?? ""),
      compUntil: String(form.get("compUntil") ?? ""),
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      setExistingId(result.existingClientId ?? null);
      return;
    }

    // The account exists at this point. Surface partial failures as warnings
    // rather than losing them behind a redirect.
    if (result.inviteError) toast.error(result.inviteError);
    else if (result.inviteSent) toast.success("Client created and invite sent.");
    else toast.success("Client created.");

    if (result.watchlistError) toast.error(`Free access not granted: ${result.watchlistError}`);
    else if (result.watchlistGranted) toast.success("Free Job Alerts access granted.");

    if (result.clientId) router.push(`/admin/clients/${result.clientId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          {existingId && (
            <Link
              href={`/admin/clients/${existingId}`}
              className="inline-block mt-2 font-medium text-red-800 underline"
            >
              Open that client
            </Link>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required placeholder="Jane Doe" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
          <p className="text-xs text-neutral-400">
            This is their login. It can&apos;t be changed here later.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone <span className="text-neutral-400 font-normal">(optional)</span>
          </Label>
          <Input id="phone" name="phone" type="tel" placeholder="(608) 555-0134" />
        </div>
      </div>

      {/* Invite email */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-700 focus:ring-brand-600"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-neutral-400" /> Email them an invite now
            </span>
            <span className="text-neutral-500 mt-0.5 block">
              Sends a link to set their password. Leave this off to create the account quietly —
              you can send the invite later from their client page.
            </span>
          </span>
        </label>
      </div>

      {/* Complimentary Job Alerts */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-700 focus:ring-brand-600"
            checked={grantWatchlist}
            onChange={(e) => setGrantWatchlist(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-neutral-400" /> Give them free Job Alerts access
            </span>
            <span className="text-neutral-500 mt-0.5 block">
              Full Job Alerts &amp; Watchlist at no cost — curated matches and the weekly digest,
              same as a paying client. No card, no invoice.
            </span>
          </span>
        </label>

        {grantWatchlist && (
          <div className="mt-5 pl-7 space-y-4 border-t border-neutral-100 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="compNote">
                Reason <span className="text-neutral-400 font-normal">(optional, only you see it)</span>
              </Label>
              <Textarea
                id="compNote"
                name="compNote"
                rows={2}
                maxLength={500}
                placeholder="e.g. Friend — free while she job hunts"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compUntil">
                Ends on <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input id="compUntil" name="compUntil" type="date" min={today} />
              <p className="text-xs text-neutral-400">
                Leave blank for no end date. If set, access turns off automatically that day.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Creating…" : "Create client"}
        </Button>
        <Button asChild variant="outline" size="lg" disabled={saving}>
          <Link href="/admin/clients">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
