import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { TestimonialEditForm } from "@/components/admin/TestimonialEditForm";
import type { Testimonial } from "@/types/database";

export const metadata: Metadata = {
  title: "Edit Testimonial — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTestimonialEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin/testimonials/${id}`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("testimonials")
    .select("id, client_id, booking_id, quote, author_name, author_title, service_type, rating, status, submitted_at, approved_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  const testimonial = data as Testimonial | null;
  if (!testimonial) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Testimonials", href: "/admin/testimonials" },
          { label: testimonial.author_name },
        ]}
      />
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Edit testimonial</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Edits save immediately. Use the buttons on the list to approve, hide, or delete.
        </p>
      </div>
      <TestimonialEditForm testimonial={testimonial} />
    </div>
  );
}
