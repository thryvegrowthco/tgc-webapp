"use client";

import * as React from "react";
import { useActionState } from "react";
import { redirect } from "next/navigation";
import { User, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const [pwState, pwAction, pwPending] = useActionState(updatePassword, {});

  React.useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { redirect("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    const form = e.currentTarget;
    const data = new FormData(form);
    const supabase = createClient();
    await supabase.from("profiles").update({
      full_name: data.get("fullName") as string,
      phone: data.get("phone") as string,
      company: data.get("company") as string,
      job_title: data.get("jobTitle") as string,
    }).eq("id", profile.id);
    setSaving(false);
    setSaveSuccess(true);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-48" />
        <div className="h-4 bg-neutral-100 rounded w-64" />
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Profile</h1>
        <p className="text-neutral-500 mt-1 text-sm">Manage your account information.</p>
      </div>

      {/* Profile info */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-brand-50 rounded-lg">
            <User className="h-4 w-4 text-brand-600" />
          </div>
          <h2 className="font-display font-bold text-neutral-900">Personal Information</h2>
        </div>

        {saveSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" defaultValue={profile?.full_name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={profile?.email ?? ""} disabled className="bg-neutral-50 cursor-not-allowed" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="text-neutral-400 font-normal">(optional)</span></Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job title <span className="text-neutral-400 font-normal">(optional)</span></Label>
              <Input id="jobTitle" name="jobTitle" defaultValue={profile?.job_title ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company <span className="text-neutral-400 font-normal">(optional)</span></Label>
            <Input id="company" name="company" defaultValue={profile?.company ?? ""} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <Lock className="h-4 w-4 text-neutral-500" />
          </div>
          <h2 className="font-display font-bold text-neutral-900">Change Password</h2>
        </div>

        {pwState.error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {pwState.error}
          </div>
        )}

        <form action={pwAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" minLength={8} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" variant="outline" disabled={pwPending}>
            {pwPending ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
