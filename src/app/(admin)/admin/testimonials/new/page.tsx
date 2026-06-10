import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TestimonialEditForm } from "@/components/admin/TestimonialEditForm";

export const metadata: Metadata = {
  title: "Add Testimonial — Admin",
  robots: { index: false, follow: false },
};

export default async function NewTestimonialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/testimonials/new");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/testimonials"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All testimonials
      </Link>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Add a testimonial</h1>
        <p className="text-neutral-500 text-sm mt-1">
          For a quote a client sent you by email or in person. It&apos;s approved and live as soon as you save.
        </p>
      </div>
      <TestimonialEditForm />
    </div>
  );
}
